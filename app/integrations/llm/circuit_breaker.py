import enum
import logging
import threading
import time
from typing import Callable, Any, Optional, Dict

logger = logging.getLogger(__name__)


class CircuitState(str, enum.Enum):
    CLOSED = "closed"          # Normal operation: requests pass through
    OPEN = "open"              # Failing fast: all requests short-circuit to fallback
    HALF_OPEN = "half_open"    # Testing recovery: single probe request allowed


class CircuitBreakerOpenException(Exception):
    """Raised when an execution attempt is blocked by an open circuit breaker."""
    pass


class CircuitBreaker:
    """
    Thread-safe enterprise Circuit Breaker with exponential backoff retries (Section 8.2 & 14.1).
    Protects downstream latency and prevents cascading thread pool exhaustion during LLM outages.
    """

    def __init__(
        self,
        name: str = "LLMProvider",
        failure_threshold: int = 3,
        recovery_timeout: float = 30.0,
        request_timeout: float = 10.0,
        max_retries: int = 2,
        initial_backoff: float = 0.5,
        backoff_factor: float = 2.0,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.request_timeout = request_timeout
        self.max_retries = max_retries
        self.initial_backoff = initial_backoff
        self.backoff_factor = backoff_factor

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._last_state_change = time.time()
        self._last_failure_time = 0.0
        self._last_failure_reason: Optional[str] = None
        self._lock = threading.Lock()

    @property
    def state(self) -> CircuitState:
        with self._lock:
            if self._state == CircuitState.OPEN:
                if (time.time() - self._last_state_change) >= self.recovery_timeout:
                    self._state = CircuitState.HALF_OPEN
                    self._last_state_change = time.time()
                    logger.info(
                        f"CircuitBreaker[{self.name}]: Recovery timeout elapsed. "
                        f"State transitioned from OPEN -> HALF_OPEN (probing upstream)."
                    )
            return self._state

    def can_execute(self) -> bool:
        """Check whether a request is permitted to attempt execution."""
        current_state = self.state
        return current_state in (CircuitState.CLOSED, CircuitState.HALF_OPEN)

    def record_success(self) -> None:
        """Record successful invocation. Resets failures and closes circuit."""
        with self._lock:
            previous_state = self._state
            self._failure_count = 0
            self._state = CircuitState.CLOSED
            self._last_state_change = time.time()
            if previous_state != CircuitState.CLOSED:
                logger.info(
                    f"CircuitBreaker[{self.name}]: Upstream recovered! "
                    f"State transitioned from {previous_state.value.upper()} -> CLOSED."
                )

    def record_failure(self, error: Exception) -> None:
        """Record an execution failure and trip circuit to OPEN if threshold reached."""
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()
            self._last_failure_reason = str(error)

            if self._state == CircuitState.HALF_OPEN:
                self._state = CircuitState.OPEN
                self._last_state_change = time.time()
                logger.warning(
                    f"CircuitBreaker[{self.name}]: Probe failed in HALF_OPEN. "
                    f"Circuit re-tripped to OPEN for {self.recovery_timeout}s. Reason: {error}"
                )
            elif self._failure_count >= self.failure_threshold and self._state == CircuitState.CLOSED:
                self._state = CircuitState.OPEN
                self._last_state_change = time.time()
                logger.error(
                    f"CircuitBreaker[{self.name}]: Failure threshold ({self.failure_threshold}) reached! "
                    f"Circuit TRIPPED to OPEN for {self.recovery_timeout}s. Last error: {error}"
                )

    def execute_with_retry(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute callable through the circuit breaker with exponential backoff retries.
        Fast-fails if circuit is currently OPEN.
        """
        if not self.can_execute():
            raise CircuitBreakerOpenException(
                f"Circuit breaker '{self.name}' is OPEN. Fast-failing upstream call. "
                f"Last error: {self._last_failure_reason}"
            )

        attempts = 0
        backoff = self.initial_backoff

        while attempts <= self.max_retries:
            try:
                result = func(*args, **kwargs)
                self.record_success()
                return result
            except Exception as exc:
                attempts += 1
                if attempts > self.max_retries:
                    self.record_failure(exc)
                    raise exc
                logger.warning(
                    f"CircuitBreaker[{self.name}]: Transient error on attempt {attempts}/{self.max_retries + 1}: {exc}. "
                    f"Backing off for {backoff:.2f}s..."
                )
                time.sleep(backoff)
                backoff *= self.backoff_factor

    def get_metrics(self) -> Dict[str, Any]:
        """Observability telemetry for monitoring dashboards (Section 13.2)."""
        with self._lock:
            return {
                "name": self.name,
                "state": self._state.value,
                "failure_count": self._failure_count,
                "failure_threshold": self.failure_threshold,
                "recovery_timeout_sec": self.recovery_timeout,
                "request_timeout_sec": self.request_timeout,
                "last_failure_reason": self._last_failure_reason,
                "last_failure_timestamp": self._last_failure_time,
                "time_in_current_state_sec": round(time.time() - self._last_state_change, 2),
            }
