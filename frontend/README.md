# Aroma Management · Factory Workspace

Responsive, frontend-only manufacturing dashboard for exploring the Aroma factory automation flow. Built with React, JavaScript, CSS and Vite. All records are sample data; simple demo edits persist in the current browser only.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Create a static build with `npm run build` and serve the `dist/` directory. Configure the host to return `index.html` for app routes; `public/_redirects` includes the rule for compatible hosts.

## Structure

| Path | Purpose |
| --- | --- |
| `src/App.jsx` | Application routes |
| `src/components/Layout.jsx` | Shared navigation, logo, search and app shell |
| `src/components/factoryUI.jsx` | Reusable page headings, tables, badges and demo forms |
| `src/pages/` | Dashboard, inventory, purchasing, quality, production, reports and team screens |
| `src/styles/index.css` | Theme tokens, shared layout and responsive shell |
| `src/styles/shared.css` | Shared controls, tables and dialogs |
| `src/styles/pages/` | Page-specific stylesheets |
| `src/data/factorySeed.js` | Frontend sample records |
| `src/context/FactoryContext.jsx` | Browser-local demo state |
| `public/aroma-logo.png` | Supplied Aroma logo |

The demo state uses the `aroma-factory-demo-v1` localStorage key. Clearing that key and reloading restores the sample values.

## Backend integration

No API calls, authentication, database, machine connection or server-side permission checks are implemented. The UI and state provider are isolated so the backend team can replace browser-local state with API-backed actions and live manufacturing data.
