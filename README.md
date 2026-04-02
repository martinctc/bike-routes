# 🚴 Bike Routes

A curated collection of cycling routes across Mallorca, Girona, Calpe, London, and Snowdonia — with interactive maps, elevation profiles, and GPX downloads.

**[Live site →](https://martinctc.github.io/bike-routes/)**

## Routes

| Region | Routes | Total km | Highlights |
|--------|--------|----------|------------|
| 🇪🇸 Mallorca | 5 | 347 km | Sa Calobra, Cap de Formentor, Santuari de Lluc |
| 🇪🇸 Girona | 2 | 188 km | Rocacorba, Coastal Route & Els Àngels |
| 🇪🇸 Calpe | 4 | 300 km | Coll de Rates, Guadalest, Calpe to Pego |
| 🇬🇧 London | 3 | 400 km | Box Hill & Surrey Hills, Kent & North Downs |
| 🏴󠁧󠁢󠁷󠁬󠁳󠁿 Snowdonia | 2 | 135 km | Llanberis Pass & Slate Valleys, Anglesey & Menai Strait |

## Features

- **Interactive maps** — Leaflet-powered route maps with start/end markers
- **Elevation profiles** — [Leaflet-Elevation](https://github.com/Raruto/leaflet-elevation) for interactive map-synced charts; SVG sparklines on cards
- **OpenTopoData elevation** — EU-DEM 25m data via [OpenTopoData](https://www.opentopodata.org/) with smoothing and threshold filtering
- **Recommended stops** — cafés, photo spots, and rest points marked on each route
- **Filters** — terrain buttons, distance/elevation range sliders, difficulty tags
- **GPX downloads** — download the original GPX file for any route
- **Multi-region** — landing page with region cards, each linking to a dedicated route grid
- **Responsive** — 3 columns on desktop, 2 on tablet, 1 on mobile

## Tech stack

- Pure HTML, CSS, and vanilla JavaScript (no frameworks)
- [Leaflet](https://leafletjs.com/) for maps
- [Leaflet-Elevation](https://github.com/Raruto/leaflet-elevation) (v2.5.1) for interactive elevation charts
- [OpenTopoData](https://www.opentopodata.org/) EU-DEM 25m API for elevation data
- Python build script (`build_routes.py`) to parse GPX files and generate JSON data
- Deployed to GitHub Pages via Actions

## Adding a new route

1. Drop a `.gpx` file into `gpx/<region>/`
2. Add the region to `regions` in `build_routes.py` (if new)
3. Add route metadata to `route_meta` in `build_routes.py`
4. Run `python build_routes.py` (queries OpenTopoData API; results are cached in `data/elevation_cache.json`)
5. Commit and push — GitHub Pages deploys automatically

## Elevation data

Elevation is sourced from [OpenTopoData](https://www.opentopodata.org/) using the EU-DEM 25m dataset, rather than raw GPX-embedded data. The build script:

1. Samples ~400 trackpoints per route
2. Queries the API in batches of 100 (with 1 req/sec rate limiting)
3. Applies moving average smoothing (window=5 for visualization, window=3 for gain calculation)
4. Uses a 3m threshold filter to avoid accumulating DEM noise into total elevation gain
5. Caches results locally for fast rebuilds

## Project structure

```
├── index.html              # Region landing page
├── region.html             # Route grid for a region
├── route.html              # Route detail page (with Leaflet-Elevation)
├── css/style.css           # Stylesheet
├── js/
│   ├── home.js             # Landing page logic
│   ├── region.js           # Region page logic (cards, filters, sliders)
│   └── route.js            # Route detail logic (map, elevation chart, stops)
├── build_routes.py         # GPX parser → JSON generator (queries OpenTopoData)
├── data/
│   ├── routes.json         # All route data (generated)
│   └── regions.json        # Region metadata (generated)
└── gpx/                    # Source GPX files by region
    ├── majorca/
    ├── girona/
    ├── calpe/
    ├── london/
    └── snowdonia/
```

## License

Personal project. GPX data from personal rides.
