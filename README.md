# Badge Overlay Server

Simple Node.js server that serves a control page and an overlay page. Control updates propagate to overlay via Server-Sent Events (SSE).

Usage:

1. Install dependencies

```bash
cd "/Users/catarinabrendel/Documents/Stream Overlay/Badge_Overlay"
npm install
```

2. Start server

```bash
npm start
```

3. Open pages

- Control: http://localhost:3000/control.html
- Overlay: http://localhost:3000/overlay.html

Assets:

Place badge images in `public/assets` named like `Aspirant_Tier%20I.png` (note: spaces replaced by underscores in the overlay lookup, e.g. `Aspirant_Tier_I.png`). Also include a `default.png` fallback.
