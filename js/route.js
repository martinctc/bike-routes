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

        // Update back link to point to the route's region
        var backLink = document.querySelector('.back-link');
        if (backLink && route.region_id) {
            backLink.href = 'region.html?id=' + route.region_id;
            backLink.textContent = '← ' + route.region;
        }

        document.title = route.name + ' – ' + route.region + ' – Bike Routes';

        // Render the detail HTML first (creates #elevation-chart div)
        renderDetail(route);

        // Then set up the map with Leaflet-Elevation
        renderMapWithElevation(route);
    } catch (err) {
        console.error(err);
        document.getElementById('route-detail').innerHTML =
            '<p class="loading">Failed to load route.</p>';
    }
}

function renderMapWithElevation(route) {
    const map = L.map('route-map', {
        scrollWheelZoom: true,
        zoomControl: true
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR }).addTo(map);

    // Set up Leaflet-Elevation control
    var elevationControl = L.control.elevation({
        theme: 'lightblue-theme',
        detached: true,
        elevationDiv: '#elevation-chart',
        collapsed: false,
        imperial: false,
        followMarker: true,
        autofitBounds: true,
        summary: 'inline',
        downloadLink: false,
        ruler: true,
        legend: false,
        slope: false,
        speed: false,
        acceleration: false,
        altitude: true,
        time: false,
        distance: true,
        preferCanvas: true,
        polyline: {
            color: ROUTE_COLOR,
            weight: 4,
            opacity: 0.9
        }
    }).addTo(map);

    // Build GeoJSON from 3D coordinates [lat, lon, ele] → [lon, lat, ele]
    var geojsonCoords = route.coordinates.map(function(c) {
        return [c[1], c[0], c[2] || 0];
    });

    var geojson = {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            properties: { name: route.name },
            geometry: {
                type: "LineString",
                coordinates: geojsonCoords
            }
        }]
    };

    elevationControl.load(JSON.stringify(geojson));

    // Start and end markers
    var coords = route.coordinates;
    if (coords.length > 0) {
        var startIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="width:14px;height:14px;border-radius:50%;background:#16a34a;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });
        var endIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="width:14px;height:14px;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });

        L.marker([coords[0][0], coords[0][1]], { icon: startIcon }).addTo(map).bindPopup('Start');
        L.marker([coords[coords.length - 1][0], coords[coords.length - 1][1]], { icon: endIcon }).addTo(map).bindPopup('Finish');
    }

    // Recommended stop markers
    if (route.stops && route.stops.length) {
        var stopColors = { coffee: '#92400e', photo: '#1e40af', rest: '#065f46' };
        var stopEmoji = { coffee: '☕', photo: '📷', rest: '⛱' };
        route.stops.forEach(function(s) {
            var color = stopColors[s.type] || '#6b7280';
            var emoji = stopEmoji[s.type] || '📍';
            var icon = L.divIcon({
                className: 'custom-marker',
                html: '<div style="width:24px;height:24px;border-radius:50%;background:' + color + ';border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;">' + emoji + '</div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            L.marker([s.lat, s.lon], { icon: icon }).addTo(map)
                .bindPopup('<strong>' + s.name + '</strong><br>' + s.note);
        });
    }
}

function renderDetail(route) {
    const detail = document.getElementById('route-detail');

    var stopsHtml = '';
    if (route.stops && route.stops.length) {
        stopsHtml = '<div class="stops-section">' +
            '<h2 class="stops-heading">Recommended stops</h2>' +
            '<div class="stops-list">' +
            route.stops.map(function(s) {
                return '<div class="stop-item">' +
                    '<span class="stop-icon">' + stopIcon(s.type) + '</span>' +
                    '<div class="stop-info">' +
                        '<span class="stop-name">' + s.name + '</span>' +
                        '<span class="stop-note">' + s.note + '</span>' +
                    '</div>' +
                '</div>';
            }).join('') +
            '</div></div>';
    }

    detail.innerHTML =
        '<h1 class="route-detail-name">' + route.name + '</h1>' +
        '<p class="route-detail-subtitle">' + route.subtitle + '</p>' +
        '<div class="route-detail-stats">' +
            stat(route.distance_km + ' km', 'Distance') +
            stat(route.elevation_m + ' m', 'Elevation') +
            stat(route.region, 'Region') +
        '</div>' +
        '<div class="route-detail-tags">' +
            difficultyTag(route.difficulty) +
            terrainTag(route.terrain) +
            typeTag(route.type) +
        '</div>' +
        '<div class="elevation-chart" id="elevation-chart"></div>' +
        '<p class="route-detail-description">' + route.description + '</p>' +
        stopsHtml +
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

function stopIcon(type) {
    var icons = { coffee: '☕', photo: '📷', rest: '⛱' };
    return icons[type] || '📍';
}

function terrainTag(terrain) {
    var cls = {
        'flat': 'tag--flat',
        'some hills': 'tag--hills',
        'all the hills': 'tag--allhills'
    };
    return '<span class="tag ' + (cls[terrain] || '') + '">' + terrain + '</span>';
}

function difficultyTag(difficulty) {
    var cls = { easy: 'tag--easy', medium: 'tag--medium', hard: 'tag--hard' };
    return '<span class="tag ' + (cls[difficulty] || '') + '">' + difficulty + '</span>';
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
