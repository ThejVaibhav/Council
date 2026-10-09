# One service: build the React app, then let FastAPI serve it alongside the API on the same origin.
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=web /web/dist ./static
ENV STATIC_DIR=/app/static PORT=8000
# Free Render instances have no pre-deploy step, so migrations run at start (applied ones are skipped).
CMD python -m scripts.migrate && uvicorn app.main:app --host 0.0.0.0 --port $PORT
