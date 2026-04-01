/* ========================================
   Bike Routes – Landing Page Logic
   ======================================== */

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const grid = document.getElementById('regions-grid');
    grid.innerHTML = '<div class="loading">Loading regions…</div>';

    try {
        const [regRes, routeRes] = await Promise.all([
            fetch('data/regions.json'),
            fetch('data/routes.json')
        ]);
        const regions = await regRes.json();
        const routes = await routeRes.json();

        grid.innerHTML = '';
        regions.forEach(function(region, i) {
            var regionRoutes = routes.filter(function(r) { return r.region_id === region.id; });
            var card = document.createElement('a');
            card.className = 'region-card';
            card.href = 'region.html?id=' + region.id;

            var mapId = 'region-map-' + i;
            card.innerHTML =
                '<div class="region-card-map" id="' + mapId + '"></div>' +
                '<div class="region-card-body">' +
                    '<h2 class="region-card-name">' + region.name + '</h2>' +
                    '<p class="region-card-subtitle">' + region.subtitle + '</p>' +
                    '<div class="region-card-stats">' +
                        '<span>' + region.route_count + ' route' + (region.route_count !== 1 ? 's' : '') + '</span>' +
                        '<span>' + region.total_km + ' km total</span>' +
                    '</div>' +
                '</div>';

            grid.appendChild(card);

            requestAnimationFrame(function() {
                renderRegionMap(mapId, region.center, regionRoutes);
            });
        });
    } catch (err) {
        grid.innerHTML = '<div class="loading">Failed to load regions.</div>';
        console.error(err);
    }
}

function renderRegionMap(elementId, center, routes) {
    var el = document.getElementById(elementId);
    if (!el) return;

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

    var bounds = L.latLngBounds();
    routes.forEach(function(route) {
        if (route.coordinates && route.coordinates.length > 1) {
            var polyline = L.polyline(route.coordinates, {
                color: '#d97706',
                weight: 2.5,
                opacity: 0.7
            }).addTo(map);
            bounds.extend(polyline.getBounds());
        }
    });

    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30] });
    } else {
        map.setView(center, 10);
    }
}
