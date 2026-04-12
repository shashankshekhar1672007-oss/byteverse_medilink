export const EMERGENCY_NUMBER = "108";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

const toRad = (value) => (value * Math.PI) / 180;

const distanceKm = (from, to) => {
  const earthRadius = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const formatDistance = (km) => {
  if (!Number.isFinite(km)) return "Nearby";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

export const mapsLink = (lat, lng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

export const currentLocationLink = (location) =>
  location
    ? `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
    : "";

export const hospitalSearchLink = (location) =>
  location
    ? `https://www.google.com/maps/search/hospitals/@${location.lat},${location.lng},14z`
    : "https://www.google.com/maps/search/nearest+hospitals";

export async function fetchNearbyHospitals(location) {
  const query = `
    [out:json][timeout:14];
    (
      node["amenity"="hospital"](around:15000,${location.lat},${location.lng});
      way["amenity"="hospital"](around:15000,${location.lat},${location.lng});
      relation["amenity"="hospital"](around:15000,${location.lat},${location.lng});
      node["healthcare"="hospital"](around:15000,${location.lat},${location.lng});
      way["healthcare"="hospital"](around:15000,${location.lat},${location.lng});
      relation["healthcare"="hospital"](around:15000,${location.lat},${location.lng});
    );
    out center 25;
  `;

  let response = null;
  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);

    try {
      response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (response.ok) break;
      lastError = new Error(`Overpass endpoint returned ${response.status}`);
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!response || !response.ok) {
    throw new Error(
      "Could not load nearby hospitals right now. Open Maps or Google Maps for live results.",
    );
  }

  const data = await response.json();
  const seen = new Set();

  return (data.elements || [])
    .map((item) => {
      const point = item.center || item;
      const tags = item.tags || {};
      const lat = Number(point.lat);
      const lng = Number(point.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const name = tags.name || "Nearby hospital";
      const key = `${name}-${lat.toFixed(4)}-${lng.toFixed(4)}`;
      if (seen.has(key)) return null;
      seen.add(key);

      return {
        id: item.id || key,
        name,
        lat,
        lng,
        phone: tags.phone || tags["contact:phone"] || "",
        address: [
          tags["addr:housenumber"],
          tags["addr:street"],
          tags["addr:city"],
        ]
          .filter(Boolean)
          .join(", "),
        distance: distanceKm(location, { lat, lng }),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);
}
