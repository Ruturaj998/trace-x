from starlette.testclient import TestClient

from app.web import create_app


def test_single_origin_routes_and_cache_headers(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<main>TRACE-X</main>", encoding="utf-8")
    (tmp_path / "assets" / "build.js").write_text("export {};", encoding="utf-8")
    client = TestClient(create_app(tmp_path))
    assert client.get("/locations").text == "<main>TRACE-X</main>"
    assert client.get("/assets/missing.js").status_code == 404
    assert "immutable" in client.get("/assets/build.js").headers["Cache-Control"]
    assert client.get("/api/missing").status_code == 404
    assert client.get("/api/health").json()["database"] == "connected"
    private = client.get("/api/users/me")
    assert private.status_code == 401
    assert "no-store" in private.headers["Cache-Control"]
