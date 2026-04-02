import xml.etree.ElementTree as ET
import os, math, json

base_dir = r'C:\Users\martinchan\OneDrive\Triathlon\bike-routes'
gpx_base = os.path.join(base_dir, 'gpx')
ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def simplify_with_elevation(trkpts, sample_rate=15):
    coords = []
    elevations = []
    for i, pt in enumerate(trkpts):
        if i % sample_rate == 0 or i == len(trkpts) - 1:
            coords.append([round(float(pt.get('lat')), 5), round(float(pt.get('lon')), 5)])
            ele_el = pt.find('gpx:ele', ns)
            elevations.append(round(float(ele_el.text), 1) if ele_el is not None else None)
    return coords, elevations

def build_elevation_profile(coords, elevations):
    profile = []
    cum_dist = 0.0
    for i, (coord, ele) in enumerate(zip(coords, elevations)):
        if i > 0:
            cum_dist += haversine(coords[i-1][0], coords[i-1][1], coord[0], coord[1]) / 1000.0
        if ele is not None:
            profile.append([round(cum_dist, 2), round(ele)])
    return profile

def compute_full_stats(trkpts):
    cum_dist = 0.0
    ele_gain = 0.0
    prev_lat = prev_lon = prev_ele = None
    for pt in trkpts:
        lat = float(pt.get('lat'))
        lon = float(pt.get('lon'))
        ele_el = pt.find('gpx:ele', ns)
        ele = float(ele_el.text) if ele_el is not None else None
        if prev_lat is not None:
            cum_dist += haversine(prev_lat, prev_lon, lat, lon)
        if ele is not None and prev_ele is not None and ele > prev_ele:
            ele_gain += ele - prev_ele
        prev_lat, prev_lon = lat, lon
        if ele is not None:
            prev_ele = ele
    return round(cum_dist / 1000.0), round(ele_gain)

def compute_difficulty(distance_km, elevation_m):
    steepness = elevation_m / max(distance_km, 1)
    score = distance_km * 0.3 + elevation_m * 0.04 + steepness * 3
    if score < 60:
        return 'easy'
    elif score < 100:
        return 'medium'
    return 'hard'

def classify_terrain(elevation_m, distance_km):
    steepness = elevation_m / max(distance_km, 1)
    if steepness > 18:
        return 'all the hills'
    elif steepness > 8:
        return 'some hills'
    return 'flat'

# ── Region definitions ──────────────────────────────────────────────

regions = {
    'mallorca': {
        'id': 'mallorca',
        'name': 'Mallorca',
        'subtitle': 'Tramuntana mountains, coastal cliffs, and the central plain.',
        'center': [39.7, 2.95],
        'folder': 'majorca',
    },
    'girona': {
        'id': 'girona',
        'name': 'Girona',
        'subtitle': 'The cycling capital of Europe — Costa Brava and volcanic hills.',
        'center': [41.98, 2.82],
        'folder': 'girona',
    },
    'calpe': {
        'id': 'calpe',
        'name': 'Calpe',
        'subtitle': 'Sun-soaked climbs on the Costa Blanca.',
        'center': [38.64, -0.05],
        'folder': 'calpe',
    },
    'london': {
        'id': 'london',
        'name': 'London',
        'subtitle': 'Club rides through the Surrey Hills and the Home Counties.',
        'center': [51.3, -0.1],
        'folder': 'london',
    },
    'snowdonia': {
        'id': 'snowdonia',
        'name': 'Snowdonia',
        'subtitle': 'Wild Welsh mountains, slate valleys, and coastal roads.',
        'center': [53.05, -4.05],
        'folder': 'snowdonia',
    },
}

# ── Route metadata per GPX file ────────────────────────────────────

route_meta = {
    # Mallorca
    'Port de Pollenca - Sa Calobra and back.gpx': {
        'id': 'sa-calobra', 'region_id': 'mallorca',
        'name': 'Sa Calobra',
        'subtitle': 'Port de Pollença → Sa Calobra and back',
        'type': 'out-and-back',
        'description': (
            "The queen stage of Mallorca cycling. This epic ride from Port de Pollença "
            "tackles the legendary Sa Calobra climb, widely regarded as one of the most "
            "iconic ascents in European cycling. The route weaves through the Tramuntana "
            "mountains, climbing the Coll de Femenia and passing through Lluc before the "
            "dramatic descent to the coast on a road carved into the cliffs with 26 hairpin "
            "bends and a famous 270-degree spiral bridge. There is no other way out: you "
            "must climb back up the same spectacular road you descended. Expect breathtaking "
            "Mediterranean views at every turn and bring your climbing legs."
        ),
        'stops': [
            {'name': 'Café Santuari de Lluc', 'type': 'coffee', 'lat': 39.8236, 'lon': 2.8856,
             'note': 'Refuel at the monastery café before the big climb.'},
            {'name': 'Mirador de Sa Calobra', 'type': 'photo', 'lat': 39.8510, 'lon': 2.8090,
             'note': 'Jaw-dropping views from the top before the descent.'},
            {'name': 'Sa Calobra beach', 'type': 'rest', 'lat': 39.8516, 'lon': 2.7963,
             'note': 'Cool off at the turquoise cove at the bottom. Earn the climb back up.'},
        ]
    },
    'Port de Pollenca - Formentor and back.gpx': {
        'id': 'formentor', 'region_id': 'mallorca',
        'name': 'Cap de Formentor',
        'subtitle': 'Port de Pollença → Cap de Formentor lighthouse and back',
        'type': 'out-and-back',
        'description': (
            "A stunning coastal ride to the Cap de Formentor lighthouse at the northernmost "
            "tip of Mallorca. Several punchy climbs punctuate this dramatic road, which clings "
            "to the sea cliffs with dizzying drops and breathtaking panoramas. The ascent to "
            "Mirador de Sa Creueta offers one of the island's most photographed viewpoints, "
            "with the rocky islet of Es Colomer far below. The road surface is excellent and "
            "the scenery is world-class. Carry extra water as there are limited stops, and "
            "watch for the tunnels cut through the rock near the lighthouse."
        ),
        'stops': [
            {'name': 'Mirador de Sa Creueta', 'type': 'photo', 'lat': 39.9303, 'lon': 3.1408,
             'note': 'The iconic viewpoint over Es Colomer rock and the coast.'},
            {'name': 'Platja de Formentor', 'type': 'rest', 'lat': 39.9340, 'lon': 3.1355,
             'note': 'Pine-shaded beach perfect for a quick dip.'},
            {'name': 'Far de Formentor', 'type': 'photo', 'lat': 39.9627, 'lon': 3.2133,
             'note': 'The lighthouse at the end of the road. Worth every pedal stroke.'},
        ]
    },
    'Pollensa to Santuari de Lluc and back.gpx': {
        'id': 'pollensa-lluc', 'region_id': 'mallorca',
        'name': 'Santuari de Lluc',
        'subtitle': 'Pollença → Santuari de Lluc and back',
        'type': 'loop',
        'description': (
            "A classic Tramuntana ride to the ancient Santuari de Lluc, the spiritual heart "
            "of Mallorca and a place of pilgrimage since the 13th century. The main challenge "
            "is the steady, well-graded climb up the Coll de Sa Batalla, rewarded with sweeping "
            "mountain views and the peaceful monastery grounds where you can refuel at the café. "
            "The descent is fast and flowing, and the route loops through quiet mountain roads "
            "lined with centuries-old olive groves and fragrant pine forests. A perfect "
            "introduction to Mallorca's mountain roads."
        ),
        'stops': [
            {'name': "Café Ca'n Molinas", 'type': 'coffee', 'lat': 39.8762, 'lon': 2.9005,
             'note': 'Popular cyclist café in Caimari at the foot of the climb.'},
            {'name': 'Santuari de Lluc', 'type': 'rest', 'lat': 39.8236, 'lon': 2.8856,
             'note': 'The monastery has a café, gardens, and a small museum.'},
            {'name': 'Coll de Sa Batalla', 'type': 'photo', 'lat': 39.8310, 'lon': 2.8735,
             'note': 'Celebrate the summit with mountain views.'},
        ]
    },
    'Pollença, Sineu, Petra - FLAT.gpx': {
        'id': 'pollenca-sineu-petra', 'region_id': 'mallorca',
        'name': 'Sineu and Petra',
        'subtitle': 'Pollença → Sineu → Petra loop',
        'type': 'loop',
        'description': (
            "A long flat loop through Mallorca's agricultural heartland, the Es Pla central "
            "plain. The route passes through the charming market towns of Sineu, with its "
            "famous Wednesday market, and Petra, birthplace of Fray Junípero Serra who founded "
            "the California missions. Expect wide-open views of farmland, ancient windmills, "
            "and vineyards on quiet rural roads with minimal traffic. Perfect for building "
            "endurance on a long ride or enjoying a social outing without the stress of "
            "mountain climbing."
        ),
        'stops': [
            {'name': 'Sineu Market Square', 'type': 'coffee', 'lat': 39.6440, 'lon': 3.0018,
             'note': 'Stop for a cortado in the main square. Wednesday market is a must.'},
            {'name': 'Casa Museu Fra Juníper Serra', 'type': 'photo', 'lat': 39.6108, 'lon': 3.1077,
             'note': 'The birthplace museum in Petra — a quick cultural stop.'},
            {'name': 'Sa Pobla', 'type': 'rest', 'lat': 39.7686, 'lon': 3.0215,
             'note': 'Good bakeries and a shaded town square for a rest.'},
        ]
    },
    'Port de Pollenca - flat runde.gpx': {
        'id': 'port-pollenca-flat', 'region_id': 'mallorca',
        'name': 'Port de Pollença Flat Loop',
        'subtitle': 'Port de Pollença flat loop',
        'type': 'loop',
        'description': (
            "A relaxed flat loop from Port de Pollença through the northern coastal plains. "
            "This route follows quiet roads through the S'Albufera wetlands nature reserve "
            "and nearby farming villages, offering easy spinning with the dramatic Tramuntana "
            "mountains as a constant backdrop. Birdwatchers will enjoy passing the marshes, "
            "home to over 200 species. Ideal as a recovery ride after tackling the mountains, "
            "or a gentle introduction to cycling in Mallorca."
        ),
        'stops': [
            {'name': "S'Albufera Nature Reserve", 'type': 'photo', 'lat': 39.8015, 'lon': 3.1030,
             'note': 'Pause at the wetlands — over 200 bird species call this home.'},
            {'name': 'Café Alcúdia old town', 'type': 'coffee', 'lat': 39.8527, 'lon': 3.1211,
             'note': 'Detour into the walled old town for an excellent espresso.'},
            {'name': 'Platja de Muro', 'type': 'rest', 'lat': 39.7930, 'lon': 3.1205,
             'note': 'White sand beach just off the route for a rest stop.'},
        ]
    },
    # Girona
    'Girona_Day_2_Coastal_route_Els_Àngels.gpx': {
        'id': 'girona-coastal-angels', 'region_id': 'girona',
        'name': 'Coastal Route & Els Àngels',
        'subtitle': 'Girona → Costa Brava coast → Santuari dels Àngels',
        'type': 'loop',
        'description': (
            "A magnificent loop from Girona that combines coastal riding along the Costa "
            "Brava with the iconic climb to the Santuari dels Àngels. The route heads east "
            "through the Gavarres massif to the Mediterranean, then follows the coast before "
            "tackling the punchy ascent to the hilltop sanctuary — a favourite training climb "
            "of the Girona pro cycling community. Expect quiet country lanes, dramatic sea "
            "views, and a rewarding café stop at the top."
        ),
        'stops': [
            {'name': 'La Fàbrica', 'type': 'coffee', 'lat': 41.9794, 'lon': 2.8214,
             'note': 'The legendary cyclist café in Girona. Start or finish here.'},
            {'name': 'Santuari dels Àngels', 'type': 'photo', 'lat': 41.9485, 'lon': 2.9030,
             'note': 'Hilltop sanctuary with panoramic views over the Empordà plain.'},
            {'name': 'Platja de Sant Pol', 'type': 'rest', 'lat': 41.7870, 'lon': 3.0235,
             'note': "Beautiful cove beach in S'Agaró for a mid-ride dip."},
        ]
    },
    'Girona_Day_3_Rocacorba.gpx': {
        'id': 'girona-rocacorba', 'region_id': 'girona',
        'name': 'Rocacorba',
        'subtitle': 'Girona → Rocacorba summit and back',
        'type': 'out-and-back',
        'description': (
            "The queen climb of Girona. Rocacorba is a 10km ascent to a telecommunications "
            "tower at 968m, with gradients averaging 6-7% but kicking up to 14% near the top. "
            "Used as a benchmark climb by the many World Tour pros who call Girona home, the "
            "road winds through dense forest with little traffic. The descent is fast and "
            "technical. The ride from Girona passes through the picturesque village of "
            "Banyoles with its famous lake."
        ),
        'stops': [
            {'name': 'Banyoles Lake', 'type': 'photo', 'lat': 42.1195, 'lon': 2.7630,
             'note': 'The 1992 Olympic rowing lake — a serene rest stop.'},
            {'name': 'Rocacorba summit', 'type': 'photo', 'lat': 42.0780, 'lon': 2.7085,
             'note': 'The iconic antenna at 968m. You made it.'},
            {'name': 'Café Can Xapes, Banyoles', 'type': 'coffee', 'lat': 42.1190, 'lon': 2.7645,
             'note': 'Refuel lakeside after the big climb.'},
        ]
    },
    # Calpe
    'Calpe_Day_1_Pego.gpx': {
        'id': 'calpe-pego', 'region_id': 'calpe',
        'name': 'Calpe to Pego',
        'subtitle': 'Calpe → Pego → Orba valley loop',
        'type': 'loop',
        'description': (
            "A varied loop from Calpe heading inland through the Orba valley to the "
            "charming town of Pego, surrounded by orange groves and rice paddies at the "
            "edge of the Marjal de Pego-Oliva wetlands. The route follows quiet roads "
            "through traditional villages with a mix of flat valley riding and gentle "
            "rollers. A great introduction to the Costa Blanca interior."
        ),
        'stops': [
            {'name': 'Pego old town', 'type': 'coffee', 'lat': 38.8425, 'lon': -0.1190,
             'note': 'Pretty hilltop town with good cafés around the church square.'},
            {'name': 'Marjal de Pego-Oliva', 'type': 'photo', 'lat': 38.8650, 'lon': -0.0700,
             'note': 'Wetland nature reserve — watch for herons and flamingos.'},
        ]
    },
    'Calpe_Day_2_Guadalest.gpx': {
        'id': 'calpe-guadalest', 'region_id': 'calpe',
        'name': 'Guadalest',
        'subtitle': 'Calpe → Guadalest castle and back',
        'type': 'out-and-back',
        'description': (
            "A classic Costa Blanca ride to the spectacular hilltop village of Guadalest, "
            "perched on a rocky pinnacle above a turquoise reservoir. The climb from Callosa "
            "d'en Sarrià is steady and scenic, winding through almond and cherry orchards "
            "with views of the reservoir appearing as you gain height. The village itself, "
            "accessed through a rock tunnel, is one of Spain's most visited — arrive early "
            "to beat the tour buses."
        ),
        'stops': [
            {'name': 'Castell de Guadalest', 'type': 'photo', 'lat': 38.6785, 'lon': -0.1950,
             'note': 'The castle ruins and reservoir viewpoint — absolutely stunning.'},
            {'name': 'Fonts de l\'Algar', 'type': 'rest', 'lat': 38.6870, 'lon': -0.1520,
             'note': 'Natural waterfalls and rock pools near Callosa. Worth a detour.'},
            {'name': 'Café in Callosa d\'en Sarrià', 'type': 'coffee', 'lat': 38.6530, 'lon': -0.1225,
             'note': 'Refuel in the town square before or after the climb.'},
        ]
    },
    'Calpe_Day_3_Coll_de_Rates_.gpx': {
        'id': 'calpe-coll-de-rates', 'region_id': 'calpe',
        'name': 'Coll de Rates',
        'subtitle': 'Calpe → Coll de Rates → Tárbena loop',
        'type': 'loop',
        'description': (
            "The Coll de Rates is the marquee climb of the Costa Blanca — a beautiful, "
            "well-graded 6km ascent through pine forests with sweeping views down to the "
            "Mediterranean. The route loops through the quiet mountain village of Tárbena "
            "and returns via the Orba valley. A favourite among the many cycling teams "
            "who train in Calpe each spring."
        ),
        'stops': [
            {'name': 'Coll de Rates summit', 'type': 'photo', 'lat': 38.7370, 'lon': -0.0825,
             'note': 'The col at 626m with panoramic coastal views.'},
            {'name': 'Tárbena village', 'type': 'coffee', 'lat': 38.7115, 'lon': -0.1080,
             'note': 'Tiny mountain village with a bar on the square. Pure Spain.'},
        ]
    },
    'Calpe_Day_4_Recovery_ride.gpx': {
        'id': 'calpe-recovery', 'region_id': 'calpe',
        'name': 'Calpe Recovery Ride',
        'subtitle': 'Calpe coastal recovery loop',
        'type': 'loop',
        'description': (
            "A gentle recovery spin along the Costa Blanca coast from Calpe. The route "
            "follows the seafront south past the dramatic Peñón de Ifach rock, through "
            "Altea and along quiet coastal roads. Flat and relaxed with plenty of café "
            "terraces overlooking the sea. Perfect for tired legs after the mountains."
        ),
        'stops': [
            {'name': 'Peñón de Ifach viewpoint', 'type': 'photo', 'lat': 38.6330, 'lon': 0.0475,
             'note': 'The iconic 332m limestone rock jutting into the sea.'},
            {'name': 'Altea old town', 'type': 'coffee', 'lat': 38.5990, 'lon': -0.0510,
             'note': 'White-washed hilltop town with a blue-domed church and great cafés.'},
        ]
    },
    # London
    'BECC_Sunday_Social.gpx': {
        'id': 'becc-sunday-social', 'region_id': 'london',
        'name': 'BECC Sunday Social',
        'subtitle': 'East London club ride through Essex lanes',
        'type': 'loop',
        'description': (
            "A popular Sunday club ride with the Bec CC, rolling through the quiet lanes "
            "of Essex and Hertfordshire. The route heads north from London through Epping "
            "Forest before looping through rolling farmland and pretty villages. A sociable "
            "pace with a café stop midway. A great way to build endurance while enjoying "
            "the surprisingly rural countryside just outside the M25."
        ),
        'stops': [
            {'name': 'Epping Forest', 'type': 'photo', 'lat': 51.6650, 'lon': 0.0450,
             'note': 'Ancient woodland — enjoy the shade and the deer.'},
            {'name': 'Village café stop', 'type': 'coffee', 'lat': 51.7500, 'lon': 0.0800,
             'note': 'Mid-ride café in the Essex lanes. Cake is compulsory.'},
        ]
    },
    'ELCC_Box_Hill_Ride.gpx': {
        'id': 'elcc-box-hill', 'region_id': 'london',
        'name': 'Box Hill Ride',
        'subtitle': 'South London → Box Hill → Surrey Hills loop',
        'type': 'loop',
        'description': (
            "The classic London cycling pilgrimage to Box Hill in the Surrey Hills. The "
            "route heads south through suburban London before hitting the rolling lanes of "
            "the North Downs. The zig-zag climb up Box Hill featured in the 2012 Olympic "
            "road race and is a rite of passage for any London cyclist. The café at the top "
            "is always buzzing with riders on weekends. Return via Leatherhead and quiet "
            "back roads."
        ),
        'stops': [
            {'name': 'Box Hill summit', 'type': 'photo', 'lat': 51.2570, 'lon': -0.3140,
             'note': 'The Olympic climb. Celebrate at the top with that view.'},
            {'name': 'Box Hill café', 'type': 'coffee', 'lat': 51.2580, 'lon': -0.3130,
             'note': 'The National Trust café — always packed with cyclists.'},
            {'name': 'Newlands Corner', 'type': 'rest', 'lat': 51.2280, 'lon': -0.4920,
             'note': 'Panoramic views over the Surrey countryside.'},
        ]
    },
    'ELCC_Easter_Classic.gpx': {
        'id': 'elcc-easter-classic', 'region_id': 'london',
        'name': 'Easter Classic',
        'subtitle': 'East London CC Easter sportive through Kent and Surrey',
        'type': 'loop',
        'description': (
            "The annual East London CC Easter Classic — an epic sportive-style ride through "
            "the lanes of Kent and Surrey. The route tackles the best climbs of the North "
            "Downs and Greensand Ridge, with punchy ascents like Toys Hill and Ide Hill "
            "thrown in for good measure. Long, challenging, and hugely rewarding, this ride "
            "is a proper test of spring fitness."
        ),
        'stops': [
            {'name': 'Ide Hill', 'type': 'photo', 'lat': 51.2530, 'lon': 0.0880,
             'note': 'One of the steepest climbs in Kent. Beautiful at the top.'},
            {'name': 'Westerham café', 'type': 'coffee', 'lat': 51.2650, 'lon': 0.0720,
             'note': 'Charming town for a mid-ride refuel.'},
        ]
    },
    # Snowdonia
    'North_Wales_coastal_ride.gpx': {
        'id': 'snowdonia-coastal', 'region_id': 'snowdonia',
        'name': 'North Wales Coastal Ride',
        'subtitle': 'Caernarfon → Anglesey coast → Menai Strait loop',
        'type': 'loop',
        'description': (
            "A stunning coastal loop starting from Caernarfon, crossing the Menai Strait "
            "to Anglesey and following the coast past ancient castles and hidden coves. The "
            "riding is gently rolling with sea views throughout. The route passes through "
            "Beaumaris with its UNESCO World Heritage castle before returning across the "
            "Britannia Bridge with Snowdonia's peaks as a dramatic backdrop."
        ),
        'stops': [
            {'name': 'Beaumaris Castle', 'type': 'photo', 'lat': 53.2630, 'lon': -4.0910,
             'note': 'UNESCO World Heritage castle right on the Menai Strait.'},
            {'name': 'Café in Menai Bridge', 'type': 'coffee', 'lat': 53.2255, 'lon': -4.1630,
             'note': 'Great cafés in the town by the suspension bridge.'},
            {'name': 'Caernarfon Castle', 'type': 'photo', 'lat': 53.1390, 'lon': -4.2770,
             'note': 'Magnificent castle at the start/finish — worth a wander.'},
        ]
    },
    'Slateman_Triathlon_Bike.gpx': {
        'id': 'slateman-bike', 'region_id': 'snowdonia',
        'name': 'Slateman Triathlon Bike',
        'subtitle': 'Llanberis → Pen-y-Pass → Slate valleys loop',
        'type': 'loop',
        'description': (
            "The bike leg of the Slateman Triathlon, widely regarded as one of the most "
            "scenic triathlon courses in the world. Starting from Llanberis at the foot of "
            "Snowdon, the route climbs through the dramatic Llanberis Pass to Pen-y-Pass "
            "before descending into the otherworldly slate quarry landscapes. Short but "
            "intense, with gradients over 10% and breathtaking mountain views at every turn."
        ),
        'stops': [
            {'name': 'Pen-y-Pass', 'type': 'photo', 'lat': 53.0685, 'lon': -4.0230,
             'note': 'The famous mountain pass — Snowdon trailhead with epic views.'},
            {'name': 'Pete\'s Eats, Llanberis', 'type': 'coffee', 'lat': 53.1190, 'lon': -4.1290,
             'note': 'Legendary climber and cyclist café. Massive portions.'},
        ]
    },
}

# ── Build routes and regions ───────────────────────────────────────

all_routes = []
for region_id, region in regions.items():
    folder = os.path.join(gpx_base, region['folder'])
    print(f"\n{region['name'].upper()}")
    for f in sorted(os.listdir(folder)):
        if not f.endswith('.gpx') or f not in route_meta:
            continue
        tree = ET.parse(os.path.join(folder, f))
        root = tree.getroot()
        trkpts = root.findall('.//gpx:trkpt', ns)
        coords, elevations = simplify_with_elevation(trkpts)

        meta = dict(route_meta[f])
        meta['region'] = region['name']
        meta['region_id'] = region_id
        meta['coordinates'] = coords
        meta['gpx'] = 'gpx/' + region['folder'] + '/' + f
        meta['elevation_profile'] = build_elevation_profile(coords, elevations)
        meta['distance_km'], meta['elevation_m'] = compute_full_stats(trkpts)
        meta['terrain'] = meta.get('terrain') or classify_terrain(meta['elevation_m'], meta['distance_km'])
        meta['difficulty'] = compute_difficulty(meta['distance_km'], meta['elevation_m'])

        print(f"  {meta['id']}: {meta['distance_km']}km, {meta['elevation_m']}m, {meta['difficulty']}")
        all_routes.append(meta)

terrain_order = {'all the hills': 0, 'some hills': 1, 'flat': 2}
all_routes.sort(key=lambda r: (r['region_id'], terrain_order.get(r['terrain'], 99), -r['distance_km']))

# Write routes.json
out_routes = os.path.join(base_dir, 'data', 'routes.json')
with open(out_routes, 'w', encoding='utf-8') as f:
    json.dump(all_routes, f, indent=2, ensure_ascii=False)

# Write regions.json with route counts
regions_out = []
for rid, reg in regions.items():
    reg_routes = [r for r in all_routes if r['region_id'] == rid]
    regions_out.append({
        'id': reg['id'],
        'name': reg['name'],
        'subtitle': reg['subtitle'],
        'center': reg['center'],
        'route_count': len(reg_routes),
        'total_km': sum(r['distance_km'] for r in reg_routes),
    })

out_regions = os.path.join(base_dir, 'data', 'regions.json')
with open(out_regions, 'w', encoding='utf-8') as f:
    json.dump(regions_out, f, indent=2, ensure_ascii=False)

print(f"\nGenerated routes.json with {len(all_routes)} routes across {len(regions)} regions")
print(f"Generated regions.json with {len(regions_out)} regions")
