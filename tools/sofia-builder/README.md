# Sofia Builder

A visual builder for Sofia agents.

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Docker

You can run the Sofia Builder using Docker:

### Build the Image

```bash
docker build -t sofia-builder .
```

### Run the Container

```bash
docker run -p 8080:80 sofia-builder
```

The application will be available at `http://localhost:8080`

### Configuration

- The default port is 80 inside the container
- The application is served using nginx with proper caching and routing configuration
- Static assets are automatically cached for better performance
- React Router is properly configured to handle client-side routing

### Environment Variables

None required for basic usage.
