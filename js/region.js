/* ========================================
   Bike Routes – Region Page Logic
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
    var params = new URLSearchParams(window.location.search);
    var regionId = params.get('id');
    if (!regionId) { window.location.href = 'index.html'; return; }

    var grid = document.getElementById('routes-grid');
    grid.innerHTML = '<div class="loading">Loading routes…</div>';

    try {
        var [regRes, routeRes] = await Promise.all([
            fetch('data/regions.json'),
            fetch('data/routes.json')
        ]);
        var regions = await regRes.json();
        var routes = await routeRes.json();

        var region = regions.find(function(r) { return r.id === regionId; });
        if (!region) { grid.innerHTML = '<div class="loading">Region not found.</div>'; return; }

        document.title = region.name + ' – Bike Routes';
        document.getElementById('region-name').textContent = region.name;
        document.getElementById('region-subtitle').textContent = region.subtitle;

        allRoutes = routes.filter(function(r) { return r.region_id === regionId; });

        // Build terrain filter buttons from actual data
        var terrains = {};
        allRoutes.forEach(function(r) { terrains[r.terrain] = true; });
        var filtersEl = document.getElementById('filters');
        Object.keys(terrains).forEach(function(t) {
            var btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.filter = t;
            btn.textContent = t;
            filtersEl.appendChild(btn);
        });

        setupSliders();
        setupFilters();
        applyFilters();
    } catch (err) {
        grid.innerHTML = '<div class="loading">Failed to load routes.</div>';
        console.error(err);
    }
}

function renderRoutes(routes) {
    var grid = document.getElementById('routes-grid');
    var count = document.getElementById('route-count');
    grid.innerHTML = '';

    count.textContent = routes.length + ' route' + (routes.length !== 1 ? 's' : '');

    routes.forEach(function(route, i) {
        var card = document.createElement('a');
        card.className = 'route-card';
        card.href = 'route.html?id=' + route.id;
        card.dataset.terrain = route.terrain;

        var mapId = 'card-map-' + i;

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
                    difficultyTag(route.difficulty) +
                    terrainTag(route.terrain) +
                    typeTag(route.type) +
                '</div>' +
            '</div>';

        grid.appendChild(card);

        requestAnimationFrame(function() {
            renderCardMap(mapId, route.coordinates);
            renderSparkline('card-ele-' + i, route.elevation_profile);
        });
    });
}

function renderCardMap(elementId, coordinates) {
    var el = document.getElementById(elementId);
    if (!el || !coordinates || coordinates.length === 0) return;

    var map = L.map(el, {
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

    var polyline = L.polyline(coordinates, {
        color: ROUTE_COLOR,
        weight: ROUTE_WEIGHT,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
}

function setupFilters() {
    var buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            buttons.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;
            applyFilters();
        });
    });
}

function setupSliders() {
    var dists = allRoutes.map(function(r) { return r.distance_km; });
    var eles = allRoutes.map(function(r) { return r.elevation_m; });

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
            var tmp = vMin; vMin = vMax; vMax = tmp;
            minEl.value = vMin;
            maxEl.value = vMax;
        }
        labelEl.textContent = vMin + unit + ' – ' + vMax + unit;

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
    var cls = { 'flat': 'tag--flat', 'some hills': 'tag--hills', 'all the hills': 'tag--allhills' };
    return '<span class="tag ' + (cls[terrain] || '') + '">' + terrain + '</span>';
}

function difficultyTag(difficulty) {
    var cls = { easy: 'tag--easy', medium: 'tag--medium', hard: 'tag--hard' };
    return '<span class="tag ' + (cls[difficulty] || '') + '">' + difficulty + '</span>';
}

function typeTag(type) {
    var cls = { 'loop': 'tag--loop', 'out-and-back': 'tag--out-and-back' };
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
    var eleRng = maxEle - minEle || 1;
    var pad = 2;

    var points = profile.map(function(p) {
        var x = (p[0] / maxDist) * w;
        var y = h - pad - ((p[1] - minEle) / eleRng) * (h - pad * 2);
        return x.toFixed(1) + ',' + y.toFixed(1);
    });

    var fillPath = 'M0,' + h + ' L' + points.join(' L') + ' L' + w + ',' + h + ' Z';
    var linePath = 'M' + points.join(' L');

    el.innerHTML =
        '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" class="sparkline-svg">' +
            '<defs><linearGradient id="ele-grad-' + elementId + '" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.2" />' +
                '<stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0.02" />' +
            '</linearGradient></defs>' +
            '<path d="' + fillPath + '" fill="url(#ele-grad-' + elementId + ')" />' +
            '<path d="' + linePath + '" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />' +
            '<line class="sparkline-cursor" x1="0" y1="0" x2="0" y2="' + h + '" />' +
        '</svg>' +
        '<div class="sparkline-tooltip"></div>';

    var svg = el.querySelector('svg');
    var cursor = el.querySelector('.sparkline-cursor');
    var tip = el.querySelector('.sparkline-tooltip');

    el.addEventListener('mousemove', function(e) {
        var rect = svg.getBoundingClientRect();
        var mouseX = e.clientX - rect.left;
        var pct = mouseX / rect.width;
        var dist = pct * maxDist;
        if (dist < 0 || dist > maxDist) { cursor.style.visibility = 'hidden'; tip.style.display = 'none'; return; }

        var closest = profile[0];
        for (var j = 1; j < profile.length; j++) {
            if (Math.abs(profile[j][0] - dist) < Math.abs(closest[0] - dist)) closest = profile[j];
        }
        var svgX = pct * w;
        cursor.setAttribute('x1', svgX);
        cursor.setAttribute('x2', svgX);
        cursor.style.visibility = 'visible';
        tip.style.display = 'block';
        tip.style.left = mouseX + 'px';
        tip.textContent = closest[1] + 'm · ' + closest[0].toFixed(1) + 'km';
    });

    el.addEventListener('mouseleave', function() {
        cursor.style.visibility = 'hidden';
        tip.style.display = 'none';
    });
}
