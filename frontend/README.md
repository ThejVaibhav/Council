# Council frontend

React 19 + Vite single-page app.

| Path | Purpose |
| --- | --- |
| `src/App.jsx` | Routing between sign-in, editor, planner, debate, plans, friends and recaps |
| `src/api.js` | Backend client, plus an in-browser stand-in for the static demo (`VITE_DEMO=1`) |
| `src/components/` | Planner, debate thread, verdict, share sheet, journey, editor, friends |
| `src/components/art/` | SVG characters (`figure.js`), scenes, vehicles, journey strip, Leaflet map |
| `src/story.js`, `src/shareCard.js` | Share text and image card |
| `src/geo.js` | Places, routes and journey legs on free OpenStreetMap services |

`npm run dev` (port 5288, proxies `/api` to the backend), `npm run build`, `npm run lint`.
