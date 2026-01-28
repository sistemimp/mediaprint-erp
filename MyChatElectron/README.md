# MyChatElectron

Electron shell that hosts the Mediaprint ERP instant messaging experience by reusing the same React components and API helpers already defined in the root `src/` tree.

## Setup
1. Open a terminal in this directory.
2. Run `npm install` to populate the local `node_modules` with the Electron/Vite/React dependencies.

## Development
- `npm run dev` starts the Vite renderer on `http://localhost:4173` and launches Electron with a window pointing at that server. The `HashRouter` handles `/login` and `/dashboard`, mirroring the web app routes so the existing `Login` page can operate without changes.
## Production build
1. `npm run build` compiles the renderer into `dist/`.
2. `npm run start` launches Electron against the built files.
3. Use `npm run release` to bake the production env variables and create the NSIS installer in `release/` (this runs `NODE_ENV=production` via `cross-env`, rebuilds the renderer, then packages with `electron-builder --win --x64`).

## Environment variables
- `VITE_API_BASE_URL` can be used to override the API root (default: `https://gestionale.mediaprint.it/pubblica`).
- The instant messaging WebSocket address, login endpoint, and other settings can also be tweaked via the same `VITE_*` variables defined for the web app.

## Notes
- Changes to the chat components, services, or assets under `../src` are automatically available inside this Electron shell.
