# Visual Builder Development Environment

This directory contains a small backend API and frontend web application used for the Nomos visual builder. You can run both services together using Docker Compose.

## Usage

1. Build and start the containers:
   ```bash
   docker compose -f docker.compose.yml up --build
   ```
2. Open the builder in your browser at [http://localhost:3000](http://localhost:3000).

The frontend container is built with `VITE_BACKEND_URL` set to `http://backend:8000`, allowing it to communicate with the backend API service.

Stop the stack with `Ctrl+C` and `docker compose down` when you are finished.
