FROM node:24-slim AS frontend
WORKDIR /site
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/src/ src/
COPY frontend/public/ public/
COPY frontend/index.html frontend/vite.config.js ./
ARG VITE_SITE_URL
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM python:3.14-slim
WORKDIR /srv/tracex
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 ENVIRONMENT=production
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --system --no-create-home tracex
COPY app/ app/
COPY --from=frontend /site/dist/ frontend/dist/
USER tracex
CMD ["sh", "-c", "exec uvicorn app.web:create_app --factory --host 0.0.0.0 --port \"${PORT:-8000}\" --workers \"${WEB_CONCURRENCY:-1}\""]
