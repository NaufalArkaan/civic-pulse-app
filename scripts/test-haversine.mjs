import assert from "node:assert";
import test from "node:test";

const EARTH_RADIUS_METERS = 6_371_000;

function isValidCoordinate(coord) {
  if (!coord) return false;
  const { latitude, longitude } = coord;
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  if (!isFinite(latitude) || !isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
}

const toRadians = (degrees) => (degrees * Math.PI) / 180;

function haversineDistance(pointA, pointB) {
  if (!isValidCoordinate(pointA) || !isValidCoordinate(pointB)) {
    return null;
  }
  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);
  const deltaLat = toRadians(pointB.latitude - pointA.latitude);
  const deltaLon = toRadians(pointB.longitude - pointA.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  const boundedA = Math.min(1, Math.max(0, a));
  const centralAngle = 2 * Math.atan2(Math.sqrt(boundedA), Math.sqrt(1 - boundedA));
  return EARTH_RADIUS_METERS * centralAngle;
}

function formatDistance(meters) {
  if (meters === null || meters === undefined || isNaN(meters) || meters < 0) {
    return "Menunggu lokasi";
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const kilometers = meters / 1000;
  return `${kilometers.toFixed(2).replace(".", ",")} km`;
}

test("Haversine: same coordinates should yield 0 meters", () => {
  const coord = { latitude: -7.9213, longitude: 112.5994 };
  const d = haversineDistance(coord, coord);
  assert.strictEqual(d, 0);
});

test("Haversine: valid coordinates in Malang yield expected positive distance", () => {
  const uMm = { latitude: -7.9213, longitude: 112.5994 };
  const rep1 = { latitude: -7.9225, longitude: 112.5982 };
  const d = haversineDistance(uMm, rep1);
  assert.ok(d !== null);
  // ~188 meters
  assert.ok(d > 170 && d < 210, `Expected ~188m, got ${d}`);
});

test("Haversine: invalid coordinates return null explicitly", () => {
  assert.strictEqual(haversineDistance(null, { latitude: 0, longitude: 0 }), null);
  assert.strictEqual(haversineDistance({ latitude: 95, longitude: 0 }, { latitude: 0, longitude: 0 }), null);
  assert.strictEqual(haversineDistance({ latitude: 0, longitude: 200 }, { latitude: 0, longitude: 0 }), null);
  assert.strictEqual(haversineDistance({ latitude: NaN, longitude: 0 }, { latitude: 0, longitude: 0 }), null);
});

test("formatDistance: formats correctly under 1000m and above 1000m", () => {
  assert.strictEqual(formatDistance(null), "Menunggu lokasi");
  assert.strictEqual(formatDistance(undefined), "Menunggu lokasi");
  assert.strictEqual(formatDistance(349.6), "350 m");
  assert.strictEqual(formatDistance(1250), "1,25 km");
  assert.strictEqual(formatDistance(50), "50 m");
});

