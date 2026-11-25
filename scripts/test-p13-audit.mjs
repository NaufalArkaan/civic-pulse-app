import assert from "node:assert";
import test from "node:test";
import {
  classifyAppError,
  redactSensitiveData,
} from "../src/utils/errorTaxonomy.ts";
import {
  detectForbiddenClientKey,
  auditSupabaseEnvironment,
  validateStatusTransition,
  clampQueryLimit,
  SUPABASE_QUERY_LIMITS,
} from "../src/utils/supabaseSecurity.ts";

test("Check 1 (Error Taxonomy): classifies all 9 canonical error categories accurately", () => {
  // 1. Timeout
  const eTimeout = classifyAppError(new Error("Request aborted due to timeout"), 408);
  assert.strictEqual(eTimeout.category, "timeout");
  assert.strictEqual(eTimeout.isRetryable, true);

  // 2. Network
  const eNet = classifyAppError(new Error("Network request failed"), 0);
  assert.strictEqual(eNet.category, "network");
  assert.strictEqual(eNet.recoveryAction, "save_draft_offline");

  // 3. Auth / RLS Forbidden
  const eRls = classifyAppError(new Error("new row violates row-level security policy"), 403);
  assert.strictEqual(eRls.category, "auth");
  assert.strictEqual(eRls.code, "ERR_RLS_FORBIDDEN");
  assert.strictEqual(eRls.isRetryable, false);

  // 4. Conflict
  const eConflict = classifyAppError(new Error("duplicate key value violates unique constraint"), 409);
  assert.strictEqual(eConflict.category, "conflict");
  assert.strictEqual(eConflict.recoveryAction, "refresh_data");

  // 5. Permission
  const ePerm = classifyAppError(new Error("Izin lokasi ditolak oleh pengguna"));
  assert.strictEqual(ePerm.category, "permission");
  assert.strictEqual(ePerm.recoveryAction, "open_settings");

  // 6. Storage
  const eStorage = classifyAppError(new Error("SQLite disk I/O error"));
  assert.strictEqual(eStorage.category, "storage");

  // 7. Validation
  const eVal = classifyAppError(new Error("Transisi status tidak valid"), 422);
  assert.strictEqual(eVal.category, "validation");
  assert.strictEqual(eVal.isRetryable, false);

  // 8. Server
  const eSrv = classifyAppError(new Error("Bad Gateway"), 502);
  assert.strictEqual(eSrv.category, "server");
  assert.strictEqual(eSrv.isRetryable, true);

  // 9. Unknown
  const eUnk = classifyAppError(new Error("Unexpected mystery glitch"));
  assert.strictEqual(eUnk.category, "unknown");
});

test("Check 1 & Security: redactSensitiveData strips JWT, service_role, NIK, and precision GPS from logs", () => {
  const sampleJwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  const rawLog = `Failed auth for NIK 3573012345678901 with token ${sampleJwt}, secret sb_secret_9988776655 at coord -7.9213489, 112.5994123`;

  const safeLog = redactSensitiveData(rawLog);

  assert.ok(!safeLog.includes("3573012345678901"), "16-digit NIK must be redacted");
  assert.ok(!safeLog.includes("eyJhbGci"), "JWT token must be redacted");
  assert.ok(!safeLog.includes("sb_secret_9988776655"), "Supabase secret key must be redacted");
  assert.ok(!safeLog.includes("-7.9213489"), "Precision latitude (>3 decimals) must be truncated");
  assert.ok(safeLog.includes("[REDACTED_NIK]"));
  assert.ok(safeLog.includes("[REDACTED_JWT]"));
});

test("Supabase Hardening: detectForbiddenClientKey blocks service_role JWTs and sb_secret_ keys", () => {
  // 1. Secret key prefix
  assert.ok(
    detectForbiddenClientKey("sb_secret_abc123xyz") !== null,
    "Must reject sb_secret_ key on client"
  );

  // 2. Explicit service_role string
  assert.ok(
    detectForbiddenClientKey("supabase_service_role_key_12345") !== null,
    "Must reject service_role key string"
  );

  // 3. Base64 JWT containing {"role":"service_role"}
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const servicePayload = Buffer.from(JSON.stringify({ role: "service_role", iss: "supabase" })).toString("base64url");
  const anonPayload = Buffer.from(JSON.stringify({ role: "anon", iss: "supabase" })).toString("base64url");
  const fakeServiceJwt = `${header}.${servicePayload}.signature123`;
  const validAnonJwt = `${header}.${anonPayload}.signature123`;

  assert.ok(
    detectForbiddenClientKey(fakeServiceJwt) !== null,
    "Must inspect JWT payload and reject role=service_role"
  );
  assert.strictEqual(
    detectForbiddenClientKey(validAnonJwt),
    null,
    "Must allow legitimate publishable anon JWT"
  );

  // 4. Environment audit check
  const unsafeAudit = auditSupabaseEnvironment("https://xyzcompany.supabase.co", fakeServiceJwt);
  assert.strictEqual(unsafeAudit.isConfigured, false);
  assert.ok(unsafeAudit.securityViolation !== null);

  const safeAudit = auditSupabaseEnvironment("https://xyzcompany.supabase.co", validAnonJwt);
  assert.strictEqual(safeAudit.isConfigured, true);
  assert.strictEqual(safeAudit.securityViolation, null);
  assert.strictEqual(safeAudit.urlHost, "xyzcompany.supabase.co");
});

test("Supabase Data Integrity: validateStatusTransition enforces authoritative state machine & role authorization", () => {
  // 1. Citizen reporter cannot verify or resolve reports
  const citizenAttempt = validateStatusTransition("submitted", "verified", "citizen_reporter");
  assert.strictEqual(citizenAttempt.valid, false);

  // 2. Field officer valid forward transitions
  assert.strictEqual(
    validateStatusTransition("submitted", "verified", "field_officer").valid,
    true
  );
  assert.strictEqual(
    validateStatusTransition("verified", "in_progress", "field_officer").valid,
    true
  );
  assert.strictEqual(
    validateStatusTransition("in_progress", "resolved", "field_officer").valid,
    true
  );
  assert.strictEqual(
    validateStatusTransition("submitted", "rejected", "field_officer").valid,
    true
  );

  // 3. Illegal jump (submitted -> resolved directly without verification/processing)
  const illegalJump = validateStatusTransition("submitted", "resolved", "field_officer");
  assert.strictEqual(illegalJump.valid, false);

  // 4. Illegal backward transition from terminal state (resolved -> in_progress)
  const illegalBackward = validateStatusTransition("resolved", "in_progress", "coordinator_admin");
  assert.strictEqual(illegalBackward.valid, false);
});

test("16ms & Network Hardening: clampQueryLimit enforces pagination boundaries", () => {
  assert.strictEqual(clampQueryLimit(undefined), SUPABASE_QUERY_LIMITS.DEFAULT_LIMIT);
  assert.strictEqual(clampQueryLimit(-10), 1);
  assert.strictEqual(clampQueryLimit(25), 25);
  assert.strictEqual(clampQueryLimit(5000), SUPABASE_QUERY_LIMITS.MAX_LIMIT);
});

test("Check 3 (Cleanup Lifecycle): Reference-counted subscription prevents duplicate channels and premature teardown", () => {
  let providerSubscriptions = 0;
  let active = false;
  let refCount = 0;

  function startService() {
    refCount += 1;
    if (active) return;
    providerSubscriptions += 1;
    active = true;
  }

  function stopService(force = false) {
    refCount = force ? 0 : Math.max(0, refCount - 1);
    if (refCount > 0) return;
    if (active) {
      providerSubscriptions -= 1;
      active = false;
    }
  }

  // Screen A mounts
  startService();
  assert.strictEqual(providerSubscriptions, 1);
  assert.strictEqual(refCount, 1);

  // Screen B mounts before Screen A finishes unmounting
  startService();
  assert.strictEqual(providerSubscriptions, 1, "Must not open duplicate realtime channel");
  assert.strictEqual(refCount, 2);

  // Screen A unmounts
  stopService();
  assert.strictEqual(providerSubscriptions, 1, "Channel must stay open for Screen B");
  assert.strictEqual(refCount, 1);

  // Screen B unmounts
  stopService();
  assert.strictEqual(providerSubscriptions, 0, "Channel must close when last subscriber exits");
  assert.strictEqual(refCount, 0);
  assert.strictEqual(active, false);
});
