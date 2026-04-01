/* ========================================
   Bike Routes – Route Detail Page Logic
   ======================================== */

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';
const ROUTE_COLOR = '#d97706';

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const params = new URLSearchParams(window.location.search);
    const routeId = params.get('id');

    if (!routeId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const res = await fetch('data/routes.json');
        const routes = await res.json();
        const route = routes.find(r => r.id === routeId);

        if (!route) {
            document.getElementById('route-detail').innerHTML =
                '<p class="loading">Route not found.</p>';
            return;
        }

        document.title = route.name + ' – Bike Routes';
        renderMap(route);
        renderDetail(route);
    } catch (err) {
        console.error(err);
        document.getElementById('route-detail').innerHTML =
            '<p class="loading">Failed to load route.</p>';
    }
}

function renderMap(route) {
    const map = L.map('route-map', {
        scrollWheelZoom: true,
        zoomControl: true
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR }).addTo(map);

    const polyline = L.polyline(route.coordinates, {
        color: ROUTE_COLOR,
        weight: 4,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    // Start and end markers
    const coords = route.coordinates;
    if (coords.length > 0) {
        const startIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="width:14px;height:14px;border-radius:50%;background:#16a34a;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });
        const endIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="width:14px;height:14px;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });

        L.marker(coords[0], { icon: startIcon }).addTo(map).bindPopup('Start');
        L.marker(coords[coords.length - 1], { icon: endIcon }).addTo(map).bindPopup('Finish');
    }
}

function renderDetail(route) {
    const detail = document.getElementById('route-detail');

    detail.innerHTML =
        '<h1 class="route-detail-name">' + route.name + '</h1>' +
        '<p class="route-detail-subtitle">' + route.subtitle + '</p>' +
        '<div class="route-detail-stats">' +
            stat(route.distance_km + ' km', 'Distance') +
            stat(route.elevation_m + ' m', 'Elevation') +
            stat(route.region, 'Region') +
        '</div>' +
        '<div class="route-detail-tags">' +
            terrainTag(route.terrain) +
            typeTag(route.type) +
        '</div>' +
        '<p class="route-detail-description">' + route.description + '</p>' +
        '<a class="download-btn" href="' + route.gpx + '" download>' +
            downloadIcon() +
            'Download GPX' +
        '</a>';
}

function stat(value, label) {
    return '<div class="stat">' +
        '<span class="stat-value">' + value + '</span>' +
        '<span class="stat-label">' + label + '</span>' +
    '</div>';
}

function terrainTag(terrain) {
    var cls = {
        'flat': 'tag--flat',
        'some hills': 'tag--hills',
        'all the hills': 'tag--allhills'
    };
    return '<span class="tag ' + (cls[terrain] || '') + '">' + terrain + '</span>';
}

function typeTag(type) {
    var cls = {
        'loop': 'tag--loop',
        'out-and-back': 'tag--out-and-back'
    };
    return '<span class="tag ' + (cls[type] || '') + '">' + type + '</span>';
}

function downloadIcon() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
}
