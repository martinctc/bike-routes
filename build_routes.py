import xml.etree.ElementTree as ET
import os, math, json

gpx_dir = r'C:\Users\martinchan\OneDrive\Triathlon\bike-routes\gpx\majorca'
ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def simplify_with_elevation(trkpts, sample_rate=15):
    """Sample trackpoints, returning coords and elevations from embedded GPX data."""
    coords = []
    elevations = []
    for i, pt in enumerate(trkpts):
        if i % sample_rate == 0 or i == len(trkpts) - 1:
            coords.append([round(float(pt.get('lat')), 5), round(float(pt.get('lon')), 5)])
            ele_el = pt.find('gpx:ele', ns)
            elevations.append(round(float(ele_el.text), 1) if ele_el is not None else None)
    return coords, elevations

def build_elevation_profile(coords, elevations):
    """Build elevation profile with cumulative distance (km) and elevation (m)."""
    profile = []
    cum_dist = 0.0
    for i, (coord, ele) in enumerate(zip(coords, elevations)):
        if i > 0:
            cum_dist += haversine(coords[i-1][0], coords[i-1][1], coord[0], coord[1]) / 1000.0
        if ele is not None:
            profile.append([round(cum_dist, 2), round(ele)])
    return profile

route_meta = {
    'Port de Pollenca - Sa Calobra and back.gpx': {
        'id': 'sa-calobra',
        'name': 'Sa Calobra',
        'subtitle': 'Port de Pollença → Sa Calobra and back',
        'distance_km': 94,
        'elevation_m': 1800,
        'type': 'out-and-back',
        'terrain': 'all the hills',
        'description': (
            "The queen stage of Mallorca cycling. This epic ride from Port de Pollença "
            "tackles the legendary Sa Calobra climb, widely regarded as one of the most "
            "iconic ascents in European cycling. The route weaves through the Tramuntana "
            "mountains, climbing the Coll de Femenia and passing through Lluc before the "
            "dramatic descent to the coast on a road carved into the cliffs with 26 hairpin "
            "bends and a famous 270-degree spiral bridge. There is no other way out: you "
            "must climb back up the same spectacular road you descended. Expect breathtaking "
            "Mediterranean views at every turn and bring your climbing legs."
        )
    },
    'Port de Pollenca - Formentor and back.gpx': {
        'id': 'formentor',
        'name': 'Cap de Formentor',
        'subtitle': 'Port de Pollença → Cap de Formentor lighthouse and back',
        'distance_km': 40,
        'elevation_m': 850,
        'type': 'out-and-back',
        'terrain': 'some hills',
        'description': (
            "A stunning coastal ride to the Cap de Formentor lighthouse at the northernmost "
            "tip of Mallorca. Several punchy climbs punctuate this dramatic road, which clings "
            "to the sea cliffs with dizzying drops and breathtaking panoramas. The ascent to "
            "Mirador de Sa Creueta offers one of the island's most photographed viewpoints, "
            "with the rocky islet of Es Colomer far below. The road surface is excellent and "
            "the scenery is world-class. Carry extra water as there are limited stops, and "
            "watch for the tunnels cut through the rock near the lighthouse."
        )
    },
    'Pollensa to Santuari de Lluc and back.gpx': {
        'id': 'pollensa-lluc',
        'name': 'Santuari de Lluc',
        'subtitle': 'Pollença → Santuari de Lluc and back',
        'distance_km': 64,
        'elevation_m': 950,
        'type': 'loop',
        'terrain': 'some hills',
        'description': (
            "A classic Tramuntana ride to the ancient Santuari de Lluc, the spiritual heart "
            "of Mallorca and a place of pilgrimage since the 13th century. The main challenge "
            "is the steady, well-graded climb up the Coll de Sa Batalla, rewarded with sweeping "
            "mountain views and the peaceful monastery grounds where you can refuel at the café. "
            "The descent is fast and flowing, and the route loops through quiet mountain roads "
            "lined with centuries-old olive groves and fragrant pine forests. A perfect "
            "introduction to Mallorca's mountain roads."
        )
    },
    'Pollença, Sineu, Petra - FLAT.gpx': {
        'id': 'pollenca-sineu-petra',
        'name': 'Sineu and Petra',
        'subtitle': 'Pollença → Sineu → Petra loop',
        'distance_km': 83,
        'elevation_m': 200,
        'type': 'loop',
        'terrain': 'flat',
        'description': (
            "A long flat loop through Mallorca's agricultural heartland, the Es Pla central "
            "plain. The route passes through the charming market towns of Sineu, with its "
            "famous Wednesday market, and Petra, birthplace of Fray Junípero Serra who founded "
            "the California missions. Expect wide-open views of farmland, ancient windmills, "
            "and vineyards on quiet rural roads with minimal traffic. Perfect for building "
            "endurance on a long ride or enjoying a social outing without the stress of "
            "mountain climbing."
        )
    },
    'Port de Pollenca - flat runde.gpx': {
        'id': 'port-pollenca-flat',
        'name': 'Port de Pollença Flat Loop',
        'subtitle': 'Port de Pollença flat loop',
        'distance_km': 67,
        'elevation_m': 150,
        'type': 'loop',
        'terrain': 'flat',
        'description': (
            "A relaxed flat loop from Port de Pollença through the northern coastal plains. "
            "This route follows quiet roads through the S'Albufera wetlands nature reserve "
            "and nearby farming villages, offering easy spinning with the dramatic Tramuntana "
            "mountains as a constant backdrop. Birdwatchers will enjoy passing the marshes, "
            "home to over 200 species. Ideal as a recovery ride after tackling the mountains, "
            "or a gentle introduction to cycling in Mallorca."
        )
    }
}

routes = []
for f in sorted(os.listdir(gpx_dir)):
    if not f.endswith('.gpx') or f not in route_meta:
        continue
    tree = ET.parse(os.path.join(gpx_dir, f))
    root = tree.getroot()
    trkpts = root.findall('.//gpx:trkpt', ns)
    coords, elevations = simplify_with_elevation(trkpts)

    meta = dict(route_meta[f])
    meta['region'] = 'Mallorca'
    meta['coordinates'] = coords
    meta['gpx'] = 'gpx/majorca/' + f
    meta['elevation_profile'] = build_elevation_profile(coords, elevations)

    print(f"  {meta['id']}: {len(coords)} coords, {len(meta['elevation_profile'])} elevation points")
    routes.append(meta)

terrain_order = {'all the hills': 0, 'some hills': 1, 'flat': 2}
routes.sort(key=lambda r: (terrain_order.get(r['terrain'], 99), -r['distance_km']))

out_path = r'C:\Users\martinchan\OneDrive\Triathlon\bike-routes\data\routes.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(routes, f, indent=2, ensure_ascii=False)

print(f'Generated routes.json with {len(routes)} routes')
for r in routes:
    print(f"  {r['id']}: {r['name']} ({r['distance_km']}km, {r['elevation_m']}m)")
