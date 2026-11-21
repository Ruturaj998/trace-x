"""Single-origin ASGI entry point for the built browser app and the API."""

from pathlib import Path

from starlette.applications import Starlette
from starlette.exceptions import HTTPException
from starlette.routing import Mount, Route
from starlette.responses import RedirectResponse
from starlette.staticfiles import StaticFiles

from app.main import app as api


class FrontendFiles(StaticFiles):
    async def get_response(self, path, scope):
        is_asset = Path(path).parts[:1] == ("assets",)
        try:
            response = await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404 or is_asset or Path(path).suffix:
                raise
            response = await super().get_response("index.html", scope)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Cache-Control"] = (
            "public, max-age=31536000, immutable" if is_asset else "no-cache"
        )
        return response


async def api_root(request):
    return RedirectResponse("/api/")


def create_app(dist: Path | None = None):
    directory = dist or Path(__file__).resolve().parents[1] / "frontend" / "dist"
    return Starlette(routes=[
        Route("/api", api_root),
        Mount("/api", app=api),
        Mount("/", app=FrontendFiles(directory=directory, html=True)),
    ])
