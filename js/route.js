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

    renderElevationChart('elevation-chart', route.elevation_profile);
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

function renderElevationChart(elementId, profile) {
    var el = document.getElementById(elementId);
    if (!el || !profile || profile.length < 2) return;

    var margin = { top: 16, right: 16, bottom: 32, left: 48 };
    var totalW = el.clientWidth || 700;
    var totalH = 200;
    var w = totalW - margin.left - margin.right;
    var h = totalH - margin.top - margin.bottom;

    var dists = profile.map(function(p) { return p[0]; });
    var eles = profile.map(function(p) { return p[1]; });
    var minEle = Math.min.apply(null, eles);
    var maxEle = Math.max.apply(null, eles);
    var maxDist = dists[dists.length - 1];
    var eleRange = maxEle - minEle || 1;

    // Round axis bounds for cleaner labels
    var floorEle = Math.floor(minEle / 50) * 50;
    var ceilEle = Math.ceil(maxEle / 50) * 50;
    var axisRange = ceilEle - floorEle || 50;

    function xScale(d) { return (d / maxDist) * w; }
    function yScale(e) { return h - ((e - floorEle) / axisRange) * h; }

    var points = profile.map(function(p) {
        return (margin.left + xScale(p[0])).toFixed(1) + ',' + (margin.top + yScale(p[1])).toFixed(1);
    });

    var fillPath = 'M' + margin.left + ',' + (margin.top + h) + ' L' + points.join(' L') + ' L' + (margin.left + w) + ',' + (margin.top + h) + ' Z';
    var linePath = 'M' + points.join(' L');

    // Y-axis ticks
    var yTicks = [];
    var numYTicks = Math.min(5, Math.floor(axisRange / 50) + 1);
    var yStep = axisRange / (numYTicks - 1 || 1);
    for (var i = 0; i < numYTicks; i++) {
        var val = floorEle + yStep * i;
        var y = margin.top + yScale(val);
        yTicks.push(
            '<line x1="' + margin.left + '" y1="' + y.toFixed(1) + '" x2="' + (margin.left + w) + '" y2="' + y.toFixed(1) + '" stroke="#e5e5e5" stroke-width="1" />' +
            '<text x="' + (margin.left - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" class="chart-label">' + Math.round(val) + 'm</text>'
        );
    }

    // X-axis ticks
    var xTicks = [];
    var xStep = Math.ceil(maxDist / 5 / 10) * 10;
    if (xStep < 5) xStep = 5;
    for (var d = 0; d <= maxDist; d += xStep) {
        var x = margin.left + xScale(d);
        xTicks.push(
            '<text x="' + x.toFixed(1) + '" y="' + (totalH - 4) + '" text-anchor="middle" class="chart-label">' + Math.round(d) + 'km</text>'
        );
    }

    el.innerHTML =
        '<svg viewBox="0 0 ' + totalW + ' ' + totalH + '" class="elevation-chart-svg">' +
            '<defs><linearGradient id="ele-fill-grad" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.25" />' +
                '<stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0.03" />' +
            '</linearGradient></defs>' +
            yTicks.join('') +
            xTicks.join('') +
            '<path d="' + fillPath + '" fill="url(#ele-fill-grad)" />' +
            '<path d="' + linePath + '" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linejoin="round" />' +
        '</svg>';

    // Interactive tooltip
    var svg = el.querySelector('svg');
    var tooltip = document.createElement('div');
    tooltip.className = 'elevation-tooltip';
    tooltip.style.display = 'none';
    el.appendChild(tooltip);

    svg.addEventListener('mousemove', function(e) {
        var rect = svg.getBoundingClientRect();
        var mouseX = e.clientX - rect.left;
        var svgX = mouseX * (totalW / rect.width);
        var dist = ((svgX - margin.left) / w) * maxDist;
        if (dist < 0 || dist > maxDist) { tooltip.style.display = 'none'; return; }

        // Find closest point
        var closest = profile[0];
        for (var j = 1; j < profile.length; j++) {
            if (Math.abs(profile[j][0] - dist) < Math.abs(closest[0] - dist)) {
                closest = profile[j];
            }
        }

        tooltip.style.display = 'block';
        tooltip.style.left = mouseX + 'px';
        tooltip.innerHTML = '<strong>' + closest[1] + 'm</strong><br>' + closest[0].toFixed(1) + ' km';
    });

    svg.addEventListener('mouseleave', function() {
        tooltip.style.display = 'none';
    });
}
