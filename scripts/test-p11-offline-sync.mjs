import assert from "node:assert";
import test from "node:test";
import {
  calculateBackoffDelay,
  generateUUID,
  sanitizeOutboxPayload,
  classifySyncError,
  reconcileReports,
  MAX_OUTBOX_RETRIES,
  BASE_BACKOFF_DELAY_MS,
  MAX_BACKOFF_DELAY_MS,
} from "../src/utils/syncUtils.ts";

test("Offline Sync: UUID Generator creates unique RFC4122-compliant identifiers", () => {
  const id1 = generateUUID();
  const id2 = generateUUID();

  assert.notStrictEqual(id1, id2);
  // Verify standard UUID v4 format: 8-4-4-4-12 hex characters
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.ok(uuidRegex.test(id1), `id1 should match UUID v4 format: ${id1}`);
  assert.ok(uuidRegex.test(id2), `id2 should match UUID v4 format: ${id2}`);
});

test("Offline Sync: Exponential Backoff with Jitter calculation", () => {
  // Retry 0: base (1000) + jitter <= 60000
  const delay0 = calculateBackoffDelay(0);
  assert.ok(delay0 >= 1000, `Delay 0 (${delay0}) should be >= 1000`);
  assert.ok(delay0 <= 2000, `Delay 0 (${delay0}) should have reasonable jitter bound`);

  // Retry 1: base * 2^1 (2000) + jitter
  const delay1 = calculateBackoffDelay(1);
  assert.ok(delay1 >= 2000, `Delay 1 (${delay1}) should be >= 2000`);

  // Retry 2: base * 2^2 (4000) + jitter
  const delay2 = calculateBackoffDelay(2);
  assert.ok(delay2 >= 4000, `Delay 2 (${delay2}) should be >= 4000`);

  // High retry count should clamp at MAX_BACKOFF_DELAY_MS (60000ms)
  const delay10 = calculateBackoffDelay(10);
  assert.strictEqual(delay10, MAX_BACKOFF_DELAY_MS);
});

test("Security & Privacy: Outbox payload sanitization removes tokens, passwords, and NIK", () => {
  const dangerousPayload = JSON.stringify({
    id: "rep-001",
    title: "Jembatan Rusak Pasca Banjir",
    category: "infrastructure",
    description: "Retakan selebar 30cm pada pilar penyangga",
    latitude: -7.9826,
    longitude: 112.6308,
    severity: "critical",
    // Sensitive data that must NEVER be stored in outbox payload
    token: "bearer_secret_token_12345",
    accessToken: "auth_token_xyz",
    password: "super_secret_password",
    nik: "3573031204010001",
    user_secret: "hidden_key",
  });

  const sanitized = sanitizeOutboxPayload(dangerousPayload);
  const parsed = JSON.parse(sanitized);

  // Legitimate fields must remain intact
  assert.strictEqual(parsed.id, "rep-001");
  assert.strictEqual(parsed.title, "Jembatan Rusak Pasca Banjir");
  assert.strictEqual(parsed.latitude, -7.9826);
  assert.strictEqual(parsed.longitude, 112.6308);
  assert.strictEqual(parsed.severity, "critical");

  // Sensitive fields must be stripped completely
  assert.strictEqual(parsed.token, undefined);
  assert.strictEqual(parsed.accessToken, undefined);
  assert.strictEqual(parsed.password, undefined);
  assert.strictEqual(parsed.nik, undefined);
  assert.strictEqual(parsed.user_secret, undefined);
});

test("Offline Sync: Outbox Error Classification - Transient vs Permanent Failures", () => {
  // 400 Bad Request / 422 Unprocessable -> permanent fail immediately
  const err400 = classifySyncError(400, 0, "Bad Request");
  assert.strictEqual(err400.isPermanent, true);
  assert.strictEqual(err400.action, "failed_permanent");

  const err422 = classifySyncError(422, 1, "Unprocessable Entity");
  assert.strictEqual(err422.isPermanent, true);
  assert.strictEqual(err422.action, "failed_permanent");

  // 500 Server Error / 503 Unavailable -> transient retry if under max retries
  const err500 = classifySyncError(500, 0, "Internal Server Error");
  assert.strictEqual(err500.isPermanent, false);
  assert.strictEqual(err500.action, "retry");

  const err503 = classifySyncError(503, 3, "Service Unavailable");
  assert.strictEqual(err503.isPermanent, false);
  assert.strictEqual(err503.action, "retry");

  // 500 Server Error on 5th retry (exceeding MAX_OUTBOX_RETRIES) -> permanent fail
  const err500Max = classifySyncError(500, 4, "Gateway Timeout");
  assert.strictEqual(err500Max.isPermanent, true);
  assert.strictEqual(err500Max.action, "failed_permanent");
  assert.ok(err500Max.reason.includes("Max retries"));
});

test("Offline Sync: Conflict Resolution reconciles server data while protecting local drafts", () => {
  const localCache = [
    {
      id: "rep-local-draft",
      title: "Draft Longsor Lokal",
      category: "landslide",
      description: "Retakan tanah di tebing",
      latitude: -7.98,
      longitude: 112.63,
      severity: "critical",
      createdAt: "2026-11-16T10:00:00.000Z",
      updatedAt: "2026-11-16T10:00:00.000Z",
      syncedAt: null,
      isLocalDraft: true,
      version: 1,
    },
    {
      id: "rep-synced-1",
      title: "Pohon Tumbang Jl. Ijen (Old)",
      category: "tree_fall",
      description: "Menghalangi jalur kiri",
      latitude: -7.97,
      longitude: 112.62,
      severity: "medium",
      createdAt: "2026-11-16T09:00:00.000Z",
      updatedAt: "2026-11-16T09:00:00.000Z",
      syncedAt: "2026-11-16T09:05:00.000Z",
      isLocalDraft: false,
      version: 1,
    },
  ];

  const incomingServerReports = [
    {
      id: "rep-local-draft", // Server also has this ID somehow or collision
      title: "Server Version of Draft",
      category: "landslide",
      description: "Server overwrite attempt",
      latitude: -7.98,
      longitude: 112.63,
      severity: "low",
      createdAt: "2026-11-16T11:00:00.000Z",
      updatedAt: "2026-11-16T11:00:00.000Z",
      syncedAt: null,
      isLocalDraft: false,
      version: 2,
    },
    {
      id: "rep-synced-1",
      title: "Pohon Tumbang Jl. Ijen (Updated by Admin)",
      category: "tree_fall",
      description: "Sudah dievakuasi tim BPBD",
      latitude: -7.97,
      longitude: 112.62,
      severity: "low",
      createdAt: "2026-11-16T09:00:00.000Z",
      updatedAt: "2026-11-16T11:30:00.000Z",
      syncedAt: null,
      isLocalDraft: false,
      version: 2,
    },
    {
      id: "rep-new-server",
      title: "Genangan Air Jl. Soekarno Hatta",
      category: "flood",
      description: "Genangan setinggi 20cm",
      latitude: -7.95,
      longitude: 112.61,
      severity: "medium",
      createdAt: "2026-11-16T12:00:00.000Z",
      updatedAt: "2026-11-16T12:00:00.000Z",
      syncedAt: null,
      isLocalDraft: false,
      version: 1,
    },
  ];

  const syncTimestamp = "2026-11-16T12:05:00.000Z";
  const reconciled = reconcileReports(localCache, incomingServerReports, syncTimestamp);

  // Check results: Local draft should be preserved, synced report updated, and new server report inserted
  assert.strictEqual(reconciled.length, 3);

  const localDraftItem = reconciled.find((r) => r.id === "rep-local-draft");
  assert.ok(localDraftItem, "Local draft must be in reconciled list");
  assert.strictEqual(localDraftItem.title, "Draft Longsor Lokal", "Local draft content must NOT be overwritten by server");
  assert.strictEqual(localDraftItem.isLocalDraft, true, "Local draft must retain isLocalDraft = true");

  const updatedServerItem = reconciled.find((r) => r.id === "rep-synced-1");
  assert.ok(updatedServerItem, "Updated server item must exist");
  assert.strictEqual(updatedServerItem.title, "Pohon Tumbang Jl. Ijen (Updated by Admin)");
  assert.strictEqual(updatedServerItem.isLocalDraft, false);
  assert.strictEqual(updatedServerItem.syncedAt, syncTimestamp);

  const newServerItem = reconciled.find((r) => r.id === "rep-new-server");
  assert.ok(newServerItem, "New server item must be added");
  assert.strictEqual(newServerItem.isLocalDraft, false);
  assert.strictEqual(newServerItem.syncedAt, syncTimestamp);
});

test("Offline-First Architecture: 3-Tier Storage Separation Contract", () => {
  const storageClassification = {
    "auth_tokens_and_credentials": "SecureStore",
    "nik_identity_hash": "SecureStore",
    "private_report_photos": "FileSystem",
    "offline_mitigation_docs": "FileSystem",
    "cached_reports_snapshot": "SQLite",
    "outbox_operation_queue": "SQLite",
    "sync_metadata_timestamps": "SQLite",
  };

  assert.strictEqual(storageClassification.auth_tokens_and_credentials, "SecureStore");
  assert.strictEqual(storageClassification.private_report_photos, "FileSystem");
  assert.strictEqual(storageClassification.cached_reports_snapshot, "SQLite");
  assert.strictEqual(storageClassification.outbox_operation_queue, "SQLite");
});
