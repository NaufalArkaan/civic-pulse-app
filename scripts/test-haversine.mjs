import assert from "node:assert";
import test from "node:test";
import { haversineDistance, isValidCoordinate } from "../src/utils/haversine.ts";
import { formatDistance } from "../src/utils/formatDistance.ts";

test("isValidCoordinate: validates latitude and longitude ranges strictly", () => {
  // Valid coordinates
  assert.strictEqual(isValidCoordinate({ latitude: 0, longitude: 0 }), true);
  assert.strictEqual(isValidCoordinate({ latitude: -90, longitude: -180 }), true);
  assert.strictEqual(isValidCoordinate({ latitude: 90, longitude: 180 }), true);
  assert.strictEqual(isValidCoordinate({ latitude: -7.9213, longitude: 112.5994 }), true);

  // Invalid null / undefined / falsy
  assert.strictEqual(isValidCoordinate(null), false);
  assert.strictEqual(isValidCoordinate(undefined), false);

  // Non-number types
  assert.strictEqual(isValidCoordinate({ latitude: "0", longitude: 0 }), false);
  assert.strictEqual(isValidCoordinate({ latitude: 0, longitude: null }), false);

  // NaN & Infinity
  assert.strictEqual(isValidCoordinate({ latitude: NaN, longitude: 0 }), false);
  assert.strictEqual(isValidCoordinate({ latitude: 0, longitude: NaN }), false);
  assert.strictEqual(isValidCoordinate({ latitude: Infinity, longitude: 0 }), false);
  assert.strictEqual(isValidCoordinate({ latitude: -Infinity, longitude: 0 }), false);
  assert.strictEqual(isValidCoordinate({ latitude: 0, longitude: Infinity }), false);
  assert.strictEqual(isValidCoordinate({ latitude: 0, longitude: -Infinity }), false);

  // Out of bounds
  assert.strictEqual(isValidCoordinate({ latitude: 90.0001, longitude: 0 }), false);
  assert.strictEqual(isValidCoordinate({ latitude: -90.0001, longitude: 0 }), false);
  assert.strictEqual(isValidCoordinate({ latitude: 0, longitude: 180.0001 }), false);
  assert.strictEqual(isValidCoordinate({ latitude: 0, longitude: -180.0001 }), false);
});

test("Haversine: same coordinates must yield exactly 0 meters", () => {
  const coordMalang = { latitude: -7.9213, longitude: 112.5994 };
  const d1 = haversineDistance(coordMalang, coordMalang);
  assert.strictEqual(d1, 0);

  const coordPole = { latitude: 90, longitude: 0 };
  const d2 = haversineDistance(coordPole, coordPole);
  assert.strictEqual(d2, 0);

  const coordEquator = { latitude: 0, longitude: 180 };
  const d3 = haversineDistance(coordEquator, coordEquator);
  assert.strictEqual(d3, 0);
});

test("Haversine: two distinct coordinates yield positive, finite distance", () => {
  const userLoc = { latitude: -7.9213, longitude: 112.5994 }; // Kampus III UMM
  const report1 = { latitude: -7.9225, longitude: 112.5982 }; // Jl. Raya Tlogomas
  const distance = haversineDistance(userLoc, report1);

  assert.ok(distance !== null);
  assert.ok(Number.isFinite(distance));
  assert.ok(distance > 0, "Distance must be strictly positive for distinct points");
  // ~188 meters (tolerance 170 - 210 meters)
  assert.ok(distance > 170 && distance < 210, `Expected ~188m, got ${distance}`);
});

test("Haversine: global distance calculation (antipodal & equator)", () => {
  // Quarter of earth circumference (equator to north pole = ~10,007 km)
  const pole = { latitude: 90, longitude: 0 };
  const equator = { latitude: 0, longitude: 0 };
  const dPoleEquator = haversineDistance(pole, equator);

  assert.ok(dPoleEquator !== null);
  assert.ok(Number.isFinite(dPoleEquator));
  assert.ok(dPoleEquator > 10_000_000 && dPoleEquator < 10_020_000, `Got ${dPoleEquator}`);
});

test("Haversine: invalid coordinates return null without crashing", () => {
  const valid = { latitude: -7.9213, longitude: 112.5994 };

  assert.strictEqual(haversineDistance(null, valid), null);
  assert.strictEqual(haversineDistance(valid, null), null);
  assert.strictEqual(haversineDistance(undefined, valid), null);
  assert.strictEqual(haversineDistance(valid, undefined), null);
  assert.strictEqual(haversineDistance({ latitude: NaN, longitude: 112 }, valid), null);
  assert.strictEqual(haversineDistance(valid, { latitude: Infinity, longitude: 112 }), null);
  assert.strictEqual(haversineDistance({ latitude: 95, longitude: 0 }, valid), null);
  assert.strictEqual(haversineDistance(valid, { latitude: 0, longitude: 200 }), null);
});

test("formatDistance: formats correctly according to SDG 11 presentation guidelines", () => {
  // Missing / invalid coordinates
  assert.strictEqual(formatDistance(null), "Menunggu lokasi");
  assert.strictEqual(formatDistance(undefined), "Menunggu lokasi");
  assert.strictEqual(formatDistance(NaN), "Menunggu lokasi");
  assert.strictEqual(formatDistance(-10), "Menunggu lokasi");

  // Zero distance
  assert.strictEqual(formatDistance(0), "0 m");

  // Under 1000 meters -> rounded to nearest integer with "m"
  assert.strictEqual(formatDistance(50), "50 m");
  assert.strictEqual(formatDistance(188.4), "188 m");
  assert.strictEqual(formatDistance(349.6), "350 m");
  assert.strictEqual(formatDistance(999.4), "999 m");

  // 1000 meters or more -> converted to km with 2 decimals and Indonesian comma
  assert.strictEqual(formatDistance(1000), "1,00 km");
  assert.strictEqual(formatDistance(1250), "1,25 km");
  assert.strictEqual(formatDistance(2456.7), "2,46 km");
  assert.strictEqual(formatDistance(10000), "10,00 km");
});
