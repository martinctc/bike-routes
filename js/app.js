/* ========================================
   Bike Routes – Index Page Logic
   ======================================== */

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';
const ROUTE_COLOR = '#d97706';
const ROUTE_WEIGHT = 3;

let allRoutes = [];
let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const grid = document.getElementById('routes-grid');
    grid.innerHTML = '<div class="loading">Loading routes…</div>';

    try {
        const res = await fetch('data/routes.json');
        allRoutes = await res.json();
        renderRoutes(allRoutes);
        setupFilters();
    } catch (err) {
        grid.innerHTML = '<div class="loading">Failed to load routes.</div>';
        console.error(err);
    }
}

function renderRoutes(routes) {
    const grid = document.getElementById('routes-grid');
    const count = document.getElementById('route-count');
    grid.innerHTML = '';

    count.textContent = routes.length + ' route' + (routes.length !== 1 ? 's' : '');

    routes.forEach((route, i) => {
        const card = document.createElement('a');
        card.className = 'route-card';
        card.href = 'route.html?id=' + route.id;
        card.dataset.terrain = route.terrain;

        const mapId = 'card-map-' + i;

        card.innerHTML =
            '<div class="route-card-map" id="' + mapId + '"></div>' +
            '<div class="route-card-body">' +
                '<h2 class="route-card-name">' + route.name + '</h2>' +
                '<div class="route-card-stats">' +
                    '<span>' + svgIcon('distance') + route.distance_km + ' km</span>' +
                    '<span>' + svgIcon('elevation') + route.elevation_m + ' m</span>' +
                '</div>' +
                '<div class="route-card-elevation" id="card-ele-' + i + '"></div>' +
                '<p class="route-card-description">' + route.description + '</p>' +
                '<div class="route-card-tags">' +
                    terrainTag(route.terrain) +
                    typeTag(route.type) +
                '</div>' +
            '</div>';

        grid.appendChild(card);

        // Render mini map and sparkline after card is in DOM
        requestAnimationFrame(() => {
            renderCardMap(mapId, route.coordinates);
            renderSparkline('card-ele-' + i, route.elevation_profile);
        });
    });
}

function renderCardMap(elementId, coordinates) {
    const el = document.getElementById(elementId);
    if (!el || !coordinates || coordinates.length === 0) return;

    const map = L.map(el, {
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: false
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR }).addTo(map);

    const polyline = L.polyline(coordinates, {
        color: ROUTE_COLOR,
        weight: ROUTE_WEIGHT,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
}

function setupFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;

            const filtered = activeFilter === 'all'
                ? allRoutes
                : allRoutes.filter(r => r.terrain === activeFilter);

            renderRoutes(filtered);
        });
    });
}

function terrainTag(terrain) {
    const cls = {
        'flat': 'tag--flat',
        'some hills': 'tag--hills',
        'all the hills': 'tag--allhills'
    };
    return '<span class="tag ' + (cls[terrain] || '') + '">' + terrain + '</span>';
}

function typeTag(type) {
    const cls = {
        'loop': 'tag--loop',
        'out-and-back': 'tag--out-and-back'
    };
    return '<span class="tag ' + (cls[type] || '') + '">' + type + '</span>';
}

function svgIcon(type) {
    if (type === 'distance') {
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/></svg>';
    }
    if (type === 'elevation') {
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20l7.5-12L14 14l4-6 4 12H2z"/></svg>';
    }
    return '';
}

function renderSparkline(elementId, profile) {
    var el = document.getElementById(elementId);
    if (!el || !profile || profile.length < 2) return;

    var w = el.clientWidth || 280;
    var h = 48;
    var dists = profile.map(function(p) { return p[0]; });
    var eles = profile.map(function(p) { return p[1]; });
    var minEle = Math.min.apply(null, eles);
    var maxEle = Math.max.apply(null, eles);
    var maxDist = dists[dists.length - 1];
    var eleRange = maxEle - minEle || 1;
    var pad = 2;

    var points = profile.map(function(p) {
        var x = (p[0] / maxDist) * w;
        var y = h - pad - ((p[1] - minEle) / eleRange) * (h - pad * 2);
        return x.toFixed(1) + ',' + y.toFixed(1);
    });

    // Closed polygon for fill
    var fillPath = 'M0,' + h + ' L' + points.join(' L') + ' L' + w + ',' + h + ' Z';
    var linePath = 'M' + points.join(' L');

    el.innerHTML =
        '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" class="sparkline-svg">' +
            '<path d="' + fillPath + '" fill="url(#ele-grad-' + elementId + ')" />' +
            '<path d="' + linePath + '" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />' +
            '<defs><linearGradient id="ele-grad-' + elementId + '" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.2" />' +
                '<stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0.02" />' +
            '</linearGradient></defs>' +
        '</svg>';
}
