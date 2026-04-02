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
- **Elevation profiles** — SVG sparklines on cards, full interactive chart on detail pages
- **Recommended stops** — cafés, photo spots, and rest points marked on each route
- **Filters** — terrain buttons, distance/elevation range sliders, difficulty tags
- **GPX downloads** — download the original GPX file for any route
- **Multi-region** — landing page with region cards, each linking to a dedicated route grid

## Tech stack

- Pure HTML, CSS, and vanilla JavaScript (no frameworks)
- [Leaflet](https://leafletjs.com/) for maps
- Python build script (`build_routes.py`) to parse GPX files and generate JSON data
- Deployed to GitHub Pages via Actions

## Adding a new route

1. Drop a `.gpx` file into `gpx/<region>/`
2. Add the region to `regions` in `build_routes.py` (if new)
3. Add route metadata to `route_meta` in `build_routes.py`
4. Run `python build_routes.py`
5. Commit and push — GitHub Pages deploys automatically

## Project structure

```
├── index.html              # Region landing page
├── region.html             # Route grid for a region
├── route.html              # Route detail page
├── css/style.css           # Stylesheet
├── js/
│   ├── home.js             # Landing page logic
│   ├── region.js           # Region page logic (cards, filters, sliders)
│   └── route.js            # Route detail logic (map, chart, stops)
├── build_routes.py         # GPX parser → JSON generator
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
