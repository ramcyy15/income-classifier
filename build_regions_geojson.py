import json
import os
import urllib.parse
import urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
GEO_DIR = os.path.join(BASE, "data", "geo")
OUT_PATH = os.path.join(GEO_DIR, "qc5_polygons.geojson")

BARANGAYS = {
    "Bagbag": ["Bagbag"],
    "Capri": ["Capri"],
    "Fairview": ["Fairview"],
    "Greater Lagro": ["Greater Lagro"],
    "Gulod": ["Gulod"],
    "Kaligayahan": ["Kaligayahan"],
    "Nagkaisang Nayon": ["Nagkaisang Nayon"],
    "North Fairview": ["North Fairview"],
    "Novaliches Proper": ["Novaliches Proper"],
    "Pasong Putik Proper": ["Pasong Putik Proper", "Pasong Putik"],
    "San Agustin": ["San Agustin"],
    "San Bartolome": ["San Bartolome"],
    "Santa Lucia": ["Santa Lucia"],
    "Santa Monica": ["Santa Monica"],
}

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
QC_AREA_ID = 3600106569


def build_query():
    name_filters = []
    for variants in BARANGAYS.values():
        for v in variants:
            name_filters.append(f'  relation["admin_level"="10"]["name"="{v}"](area.qc);')
    return (
        "[out:json][timeout:120];\n"
        f"area({QC_AREA_ID})->.qc;\n"
        "(\n"
        + "\n".join(name_filters)
        + "\n);\n"
        "out geom;"
    )


def fetch_overpass(query):
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    req = urllib.request.Request(
        OVERPASS_URL,
        data=data,
        headers={"User-Agent": "qc5-incomeclassifier/1.0"},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode("utf-8"))


def relation_to_rings(elem):
    outers = [m for m in elem.get("members", []) if m.get("role") == "outer"]
    rings = []
    for m in outers:
        coords = [[g["lon"], g["lat"]] for g in m.get("geometry", [])]
        if len(coords) < 3:
            continue
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        rings.append(coords)
    return rings


def canon_name(osm_name):
    for canon, variants in BARANGAYS.items():
        if osm_name in variants:
            return canon
    return None


def main():
    os.makedirs(GEO_DIR, exist_ok=True)

    print("Querying Overpass API for QC-5 barangay polygons...")
    raw = fetch_overpass(build_query())
    elements = raw.get("elements", [])
    print(f"  received {len(elements)} elements")

    features_by_brgy = {}
    for elem in elements:
        if elem.get("type") != "relation":
            continue
        osm_name = (elem.get("tags") or {}).get("name")
        canon = canon_name(osm_name)
        if not canon:
            continue
        rings = relation_to_rings(elem)
        if not rings:
            continue
        if len(rings) == 1:
            geom = {"type": "Polygon", "coordinates": [rings[0]]}
        else:
            geom = {"type": "MultiPolygon", "coordinates": [[r] for r in rings]}
        features_by_brgy[canon] = {
            "type": "Feature",
            "id": canon,
            "properties": {
                "barangay": canon,
                "osm_name": osm_name,
                "osm_id": elem.get("id"),
            },
            "geometry": geom,
        }

    missing = [b for b in BARANGAYS if b not in features_by_brgy]
    if missing:
        print(f"  WARNING: {len(missing)} barangays not matched: {missing}")

    fc = {
        "type": "FeatureCollection",
        "features": [features_by_brgy[b] for b in BARANGAYS if b in features_by_brgy],
    }
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(fc, f)
    print(f"Wrote {len(fc['features'])} features to {OUT_PATH}")


if __name__ == "__main__":
    main()
