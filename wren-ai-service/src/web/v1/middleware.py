"""
BYOK (Bring Your Own Key) context for per-request LLM API key overrides.

Uses Python's contextvars to propagate the BYOK API key from the request
middleware through to the litellm provider without modifying every function
signature in the pipeline chain.
"""
from contextvars import ContextVar
from typing import Optional

# Context variable holding the BYOK API key for the current request.
# None means "use the system default key".
byok_api_key: ContextVar[Optional[str]] = ContextVar("byok_api_key", default=None)
byok_provider: ContextVar[Optional[str]] = ContextVar("byok_provider", default=None)


def get_byok_api_key() -> Optional[str]:
    """Get the BYOK API key for the current request, or None."""
    return byok_api_key.get()


def get_byok_provider() -> Optional[str]:
    """Get the BYOK provider for the current request, or None."""
    return byok_provider.get()


class ByokMiddleware:
    """
    Pure ASGI middleware that reads BYOK headers from incoming requests
    and stores them in context variables for use by LLM providers.

    Uses raw ASGI middleware (not BaseHTTPMiddleware) to ensure contextvars
    are properly propagated to background tasks.

    Headers:
        X-LLM-Api-Key: The API key to use for LLM calls
        X-LLM-Provider: The LLM provider name (e.g. 'openrouter', 'openai')
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            # Parse headers (they're bytes tuples in ASGI)
            headers = dict(scope.get("headers", []))
            api_key_bytes = headers.get(b"x-llm-api-key", b"")
            provider_bytes = headers.get(b"x-llm-provider", b"")

            api_key = api_key_bytes.decode() if api_key_bytes else None
            provider = provider_bytes.decode() if provider_bytes else None

            token_key = byok_api_key.set(api_key if api_key else None)
            token_provider = byok_provider.set(provider if provider else None)

            try:
                await self.app(scope, receive, send)
            finally:
                byok_api_key.reset(token_key)
                byok_provider.reset(token_provider)
        else:
            await self.app(scope, receive, send)
