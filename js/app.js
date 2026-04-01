/* ========================================
   Bike Routes – Index Page Logic
   ======================================== */

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';
const ROUTE_COLOR = '#d97706';
const ROUTE_WEIGHT = 3;

let allRoutes = [];
let activeFilter = 'all';
let distRange = [0, Infinity];
let eleRange = [0, Infinity];

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const grid = document.getElementById('routes-grid');
    grid.innerHTML = '<div class="loading">Loading routes…</div>';

    try {
        const res = await fetch('data/routes.json');
        allRoutes = await res.json();
        setupSliders();
        setupFilters();
        applyFilters();
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
            applyFilters();
        });
    });
}

function setupSliders() {
    var dists = allRoutes.map(r => r.distance_km);
    var eles = allRoutes.map(r => r.elevation_m);

    var dMin = Math.min.apply(null, dists);
    var dMax = Math.max.apply(null, dists);
    var eMin = Math.min.apply(null, eles);
    var eMax = Math.max.apply(null, eles);

    distRange = [dMin, dMax];
    eleRange = [eMin, eMax];

    initRangeSlider('dist-min', 'dist-max', 'dist-label', 'dist-track', dMin, dMax, ' km', function(lo, hi) {
        distRange = [lo, hi];
        applyFilters();
    });
    initRangeSlider('ele-min', 'ele-max', 'ele-label', 'ele-track', eMin, eMax, ' m', function(lo, hi) {
        eleRange = [lo, hi];
        applyFilters();
    });
}

function initRangeSlider(minId, maxId, labelId, trackId, lo, hi, unit, onChange) {
    var minEl = document.getElementById(minId);
    var maxEl = document.getElementById(maxId);
    var labelEl = document.getElementById(labelId);
    var trackEl = document.getElementById(trackId);

    minEl.min = maxEl.min = lo;
    minEl.max = maxEl.max = hi;
    minEl.value = lo;
    maxEl.value = hi;

    function update() {
        var vMin = parseInt(minEl.value);
        var vMax = parseInt(maxEl.value);
        if (vMin > vMax) {
            // Swap if dragged past each other
            var tmp = vMin; vMin = vMax; vMax = tmp;
            minEl.value = vMin;
            maxEl.value = vMax;
        }
        labelEl.textContent = vMin + unit + ' – ' + vMax + unit;

        // Highlight track between thumbs
        var pctMin = ((vMin - lo) / (hi - lo)) * 100;
        var pctMax = ((vMax - lo) / (hi - lo)) * 100;
        trackEl.style.left = pctMin + '%';
        trackEl.style.width = (pctMax - pctMin) + '%';

        onChange(vMin, vMax);
    }

    minEl.addEventListener('input', update);
    maxEl.addEventListener('input', update);
    update();
}

function applyFilters() {
    var filtered = allRoutes.filter(function(r) {
        if (activeFilter !== 'all' && r.terrain !== activeFilter) return false;
        if (r.distance_km < distRange[0] || r.distance_km > distRange[1]) return false;
        if (r.elevation_m < eleRange[0] || r.elevation_m > eleRange[1]) return false;
        return true;
    });
    renderRoutes(filtered);
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
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>';
    }
    if (type === 'elevation') {
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20 10 6l4 6 5-8 2 16H3z"/></svg>';
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
