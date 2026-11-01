import math
import threading
import time
from typing import Dict, List, Optional, Tuple

from app.core.config import settings


class InMemoryRateLimiter:
    """
    Thread-safe, sliding-window rate limiter and brute-force lockout manager
    compliant with Sections 12 & 15 (Security Architecture & Enterprise Reliability).
    """

    def __init__(self):
        self._lock = threading.Lock()
        # Key -> list of request timestamps (epoch floats)
        self._requests: Dict[str, List[float]] = {}
        # Key -> list of failed attempt timestamps (epoch floats)
        self._failed_attempts: Dict[str, List[float]] = {}
        # Key -> lockout expiration timestamp
        self._lockouts: Dict[str, float] = {}

    def reset(self):
        """Reset all in-memory tracking states (useful for test isolation)."""
        with self._lock:
            self._requests.clear()
            self._failed_attempts.clear()
            self._lockouts.clear()

    def check_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int = 60
    ) -> Tuple[bool, int, int]:
        """
        Evaluate sliding-window rate limit for a given subject (IP or API key).
        Returns:
            (allowed: bool, remaining: int, retry_after_seconds: int)
        """
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            timestamps = self._requests.get(key, [])
            # Prune timestamps older than current sliding window
            timestamps = [t for t in timestamps if t > window_start]

            if len(timestamps) >= limit:
                # Oldest timestamp inside window determines when a slot frees up
                oldest_in_window = timestamps[0]
                retry_after = max(1, math.ceil(oldest_in_window + window_seconds - now))
                self._requests[key] = timestamps
                return False, 0, retry_after

            # Allow request and record timestamp
            timestamps.append(now)
            self._requests[key] = timestamps
            remaining = limit - len(timestamps)
            return True, remaining, 0

    def is_login_locked(self, ip: str, email: str) -> Tuple[bool, int]:
        """
        Check whether an (IP, email) pair is currently under temporary brute-force lockout.
        Returns:
            (is_locked: bool, seconds_remaining: int)
        """
        now = time.time()
        lock_key = f"lock:{ip}:{email.lower()}"

        with self._lock:
            lockout_until = self._lockouts.get(lock_key)
            if lockout_until and lockout_until > now:
                return True, math.ceil(lockout_until - now)
            elif lockout_until:
                # Lockout has expired; clean it up
                del self._lockouts[lock_key]

        return False, 0

    def record_login_failure(
        self,
        ip: str,
        email: str,
        max_attempts: Optional[int] = None,
        lockout_seconds: Optional[int] = None
    ) -> Tuple[bool, int, int]:
        """
        Record a failed authentication attempt.
        If failed attempts exceed the threshold within the detection window,
        places the identity under temporary lockout.

        Returns:
            (locked_now: bool, current_failures: int, lockout_duration: int)
        """
        now = time.time()
        max_attempts = max_attempts or settings.LOGIN_MAX_FAILED_ATTEMPTS
        lockout_duration = lockout_seconds or settings.LOGIN_LOCKOUT_SECONDS
        window = lockout_duration

        fail_key = f"fail:{ip}:{email.lower()}"
        lock_key = f"lock:{ip}:{email.lower()}"

        with self._lock:
            attempts = self._failed_attempts.get(fail_key, [])
            # Prune failures outside window
            attempts = [t for t in attempts if t > now - window]
            attempts.append(now)
            self._failed_attempts[fail_key] = attempts

            if len(attempts) >= max_attempts:
                self._lockouts[lock_key] = now + lockout_duration
                # Clear counter to start fresh after lockout expires
                self._failed_attempts[fail_key] = []
                return True, len(attempts), lockout_duration

            return False, len(attempts), 0

    def record_login_success(self, ip: str, email: str):
        """Clear failed attempts and lockouts upon valid credential authentication."""
        fail_key = f"fail:{ip}:{email.lower()}"
        lock_key = f"lock:{ip}:{email.lower()}"

        with self._lock:
            self._failed_attempts.pop(fail_key, None)
            self._lockouts.pop(lock_key, None)


# Global singleton rate limiter
rate_limiter = InMemoryRateLimiter()
