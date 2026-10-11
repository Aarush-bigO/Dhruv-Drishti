"""
Dhruv Drishti — Custom FastAPI Security & Latency Middleware
Tracks API processing latency for CloudWatch Synthetics and adds security headers.
"""

import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class TelemetryPerformanceMiddleware(BaseHTTPMiddleware):
    """Measures sub-second execution duration and injects performance headers."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time_ms = (time.perf_counter() - start_time) * 1000.0

        # Inject latency header for CloudWatch / Prometheus log scrapers
        response.headers["X-Process-Time-Ms"] = f"{process_time_ms:.2f}"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"

        return response
