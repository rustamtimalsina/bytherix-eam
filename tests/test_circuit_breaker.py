import time
import pytest
from app.integrations.llm.circuit_breaker import (
    CircuitBreaker,
    CircuitState,
    CircuitBreakerOpenException
)


def test_circuit_breaker_normal_closed_execution():
    """Verify normal calls succeed and circuit remains CLOSED."""
    cb = CircuitBreaker(failure_threshold=3, recovery_timeout=5.0, max_retries=1)
    
    call_count = 0
    def dummy_func():
        nonlocal call_count
        call_count += 1
        return "success"

    res = cb.execute_with_retry(dummy_func)
    assert res == "success"
    assert call_count == 1
    assert cb.state == CircuitState.CLOSED
    assert cb.can_execute() is True


def test_circuit_breaker_retries_transient_failures():
    """Verify exponential backoff retries on transient errors before reporting success."""
    cb = CircuitBreaker(failure_threshold=3, max_retries=2, initial_backoff=0.01)
    
    attempts = 0
    def flaky_func():
        nonlocal attempts
        attempts += 1
        if attempts < 2:
            raise ConnectionError("Temporary DNS drop")
        return "flaky_recovered"

    res = cb.execute_with_retry(flaky_func)
    assert res == "flaky_recovered"
    assert attempts == 2
    assert cb.state == CircuitState.CLOSED


def test_circuit_breaker_trips_to_open_after_threshold():
    """Verify 3 consecutive failed calls trip the breaker to OPEN."""
    cb = CircuitBreaker(failure_threshold=3, recovery_timeout=10.0, max_retries=0)

    def failing_func():
        raise RuntimeError("OpenAI 503 Overloaded")

    # Call 1: fails
    with pytest.raises(RuntimeError):
        cb.execute_with_retry(failing_func)
    assert cb.state == CircuitState.CLOSED

    # Call 2: fails
    with pytest.raises(RuntimeError):
        cb.execute_with_retry(failing_func)
    assert cb.state == CircuitState.CLOSED

    # Call 3: fails -> Breaker trips to OPEN!
    with pytest.raises(RuntimeError):
        cb.execute_with_retry(failing_func)
    assert cb.state == CircuitState.OPEN
    assert cb.can_execute() is False

    # Call 4: immediately fast-fails with CircuitBreakerOpenException without running the function
    invoked = False
    def probe_func():
        nonlocal invoked
        invoked = True
        return "should_not_run"

    with pytest.raises(CircuitBreakerOpenException):
        cb.execute_with_retry(probe_func)
    assert invoked is False


def test_circuit_breaker_recovery_half_open_to_closed():
    """Verify circuit transitions to HALF_OPEN after recovery timeout and recovers on success."""
    # Fast recovery timeout for testing
    cb = CircuitBreaker(failure_threshold=2, recovery_timeout=0.05, max_retries=0)

    def failing_func():
        raise RuntimeError("Service unavailable")

    with pytest.raises(RuntimeError):
        cb.execute_with_retry(failing_func)
    with pytest.raises(RuntimeError):
        cb.execute_with_retry(failing_func)

    assert cb.state == CircuitState.OPEN

    # Wait for recovery timeout
    time.sleep(0.06)
    assert cb.state == CircuitState.HALF_OPEN
    assert cb.can_execute() is True

    # Probe succeeds -> should heal circuit to CLOSED
    def recovered_func():
        return "ok"

    res = cb.execute_with_retry(recovered_func)
    assert res == "ok"
    assert cb.state == CircuitState.CLOSED


def test_circuit_breaker_probe_failure_re_trips():
    """Verify a failed probe in HALF_OPEN trips the breaker back to OPEN."""
    cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.05, max_retries=0)

    with pytest.raises(RuntimeError):
        cb.execute_with_retry(lambda: (_ for _ in ()).throw(RuntimeError("Outage")))
    assert cb.state == CircuitState.OPEN

    time.sleep(0.06)
    assert cb.state == CircuitState.HALF_OPEN

    # Probe fails -> immediately trips back to OPEN
    with pytest.raises(RuntimeError):
        cb.execute_with_retry(lambda: (_ for _ in ()).throw(RuntimeError("Still dead")))
    assert cb.state == CircuitState.OPEN


def test_circuit_breaker_metrics():
    """Verify telemetry metrics dictionary."""
    cb = CircuitBreaker(name="TestGateway", failure_threshold=3, recovery_timeout=15.0)
    metrics = cb.get_metrics()
    assert metrics["name"] == "TestGateway"
    assert metrics["state"] == "closed"
    assert metrics["failure_count"] == 0
    assert metrics["failure_threshold"] == 3
    assert metrics["recovery_timeout_sec"] == 15.0
