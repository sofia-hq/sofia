# Visual Builder Development Environment

This directory contains a small backend API and frontend web application used for the Nomos visual builder. You can run both services together using Docker Compose.

## Prerequisites

- **Node.js 16+** – required for running the frontend in development mode.
- **Python 3.11+** – required for the FastAPI backend when not using Docker.
- **Docker** – optional but recommended for running the entire stack with Docker Compose.

## Usage

1. Build and start the containers:
   ```bash
   docker compose up --build
   ```
2. Open the builder in your browser at [http://localhost:3000](http://localhost:3000).

The frontend container is built with `VITE_BACKEND_URL` set to `http://backend:8000`, allowing it to communicate with the backend API service.

Stop the stack with `Ctrl+C` and `docker compose down` when you are finished.

## Running the Frontend Locally

If you prefer not to use Docker for the UI, you can run the frontend with Node.js:

```bash
cd frontend
npm install
npm run dev
```

The development server will start at [http://localhost:5173](http://localhost:5173) by default. Use the `VITE_BACKEND_URL` environment variable to point it at the backend (e.g. `http://localhost:8000`).

## Running the Backend Locally

The backend is a small FastAPI application. Install its dependencies and run it with `uvicorn`:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Environment variables:

- `BACKEND_PORT` – port for the FastAPI server (defaults to `8000`).
- `NOMOS_SERVER_PORT` – port where the Nomos agent server is started (defaults to `8003`).

## API Endpoints

- `POST /reset` – accepts a YAML configuration and environment variables, starts or restarts a Nomos agent on `NOMOS_SERVER_PORT`.
- `POST /chat` – forwards chat requests to the running Nomos agent and returns its response.

## Ports and Environment Variables

- Frontend: `3000` (Docker) or `5173` (local dev)
- Backend: `8000`
- Nomos agent: `8003`
- `VITE_BACKEND_URL` – URL of the backend API used by the frontend
