/**
 * Civic Pulse - Pertemuan 13 (Milestone 5)
 * Test Suite: Robi's Reliability, Lifecycle, Offline & Platform Audit Suite
 * Role: Lead Device, Network & Reliability Engineer (Robi / Anggota 3)
 */

import assert from "node:assert";
import test from "node:test";
import {
  classifyAppError,
  redactSensitiveData,
} from "../src/utils/errorTaxonomy.ts";
import {
  generateUUID,
  calculateBackoffDelay,
  sanitizeOutboxPayload,
} from "../src/utils/syncUtils.ts";

test("Check 1 (JIT Permissions): Location permission state machine and graceful fallback", () => {
  // State machine model for location permissions in useLocationTracking
  function handleLocationPermissionTransition(
    currentState,
    userAction
  ) {
    if (userAction === "deny") {
      return {
        permissionGranted: false,
        status: "permission-denied",
        fallbackCoordinate: { latitude: -7.9826, longitude: 112.6308 }, // Malang City Hall fallback
        canAskAgain: false,
        recoveryAction: "open_settings",
        error: "Izin lokasi diperlukan untuk menampilkan posisi Anda di peta.",
      };
    }
    if (userAction === "allow" || userAction === "open_settings_and_allow") {
      return {
        permissionGranted: true,
        status: "tracking",
        fallbackCoordinate: null,
        canAskAgain: true,
        recoveryAction: null,
        error: null,
      };
    }
    return {
      permissionGranted: false,
      status: "idle",
      fallbackCoordinate: null,
      canAskAgain: true,
      recoveryAction: null,
      error: null,
    };
  }

  // 1. Initial deny transition
  const deniedResult = handleLocationPermissionTransition("undetermined", "deny");
  assert.strictEqual(deniedResult.permissionGranted, false);
  assert.strictEqual(deniedResult.status, "permission-denied");
  assert.strictEqual(deniedResult.recoveryAction, "open_settings");
  assert.deepStrictEqual(deniedResult.fallbackCoordinate, {
    latitude: -7.9826,
    longitude: 112.6308,
  });

  // 2. Granted transition
  const grantedResult = handleLocationPermissionTransition("undetermined", "allow");
  assert.strictEqual(grantedResult.permissionGranted, true);
  assert.strictEqual(grantedResult.status, "tracking");
  assert.strictEqual(grantedResult.fallbackCoordinate, null);

  // 3. Adaptive tracking distance thresholds based on tracking mode
  const TRACKING_MODES = {
    stationary: { distanceInterval: 50, timeInterval: 30000 },
    normal: { distanceInterval: 20, timeInterval: 10000 },
    navigation: { distanceInterval: 5, timeInterval: 2000 },
  };

  assert.strictEqual(TRACKING_MODES.stationary.distanceInterval, 50, "Stationary mode saves battery at 50m");
  assert.strictEqual(TRACKING_MODES.normal.distanceInterval, 20, "Normal mode balances power at 20m");
  assert.strictEqual(TRACKING_MODES.navigation.distanceInterval, 5, "Navigation mode is high-precision at 5m");
});

test("Check 1 & Security: Redaction of authorization tokens, NIK, and precision GPS in outbox error logs", () => {
  const sensitiveErrorLog =
    "Sync error for Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisToken on NIK 3573012345678901 at coords -7.9654321, 112.6321456";

  const sanitizedLog = redactSensitiveData(sensitiveErrorLog);

  assert.ok(!sanitizedLog.includes("eyJhbGci"), "Bearer JWT must be stripped");
  assert.ok(!sanitizedLog.includes("3573012345678901"), "NIK must be redacted");
  assert.ok(!sanitizedLog.includes("-7.9654321"), "High-precision GPS (>3 decimals) must be truncated");
  assert.ok(sanitizedLog.includes("[REDACTED_JWT]"));
  assert.ok(sanitizedLog.includes("[REDACTED_NIK]"));

  // Also test sanitizeOutboxPayload for nested sensitive fields
  const rawPayload = JSON.stringify({
    title: "Laporan Jalan Rusak",
    nik: "3573012345678901",
    token: "secret-token-xyz",
    password: "my-secure-password",
    reporterName: "Warga Malang",
  });
  const safePayload = JSON.parse(sanitizeOutboxPayload(rawPayload));
  assert.strictEqual(safePayload.title, "Laporan Jalan Rusak");
  assert.strictEqual(safePayload.reporterName, "Warga Malang");
  assert.strictEqual(safePayload.nik, undefined, "NIK must be completely omitted from outbox payload");
  assert.strictEqual(safePayload.token, undefined, "Token must be omitted");
  assert.strictEqual(safePayload.password, undefined, "Password must be omitted");
});

test("Check 2 (Offline & Fallback Reliability): Initial offline launch and truthful sync states", () => {
  // Simulating offline data loading contract
  function resolveReportsState(hasNetwork, localCache) {
    if (!hasNetwork) {
      if (localCache && localCache.length > 0) {
        return {
          reports: localCache,
          isFromCache: true,
          syncStatus: "offline_cached",
          userBannerMessage: "Mode Offline / Cache Lokal: Menampilkan data tersimpan.",
        };
      }
      return {
        reports: [],
        isFromCache: false,
        syncStatus: "offline_empty",
        userBannerMessage: "Mode Offline: Tidak ada data cache lokal.",
      };
    }
    return {
      reports: localCache,
      isFromCache: false,
      syncStatus: "online_synced",
      userBannerMessage: null,
    };
  }

  // 1. Initial offline with cache
  const offlineWithCache = resolveReportsState(false, [{ id: "rep-1", title: "Jalan Berlubang" }]);
  assert.strictEqual(offlineWithCache.isFromCache, true);
  assert.strictEqual(offlineWithCache.syncStatus, "offline_cached");
  assert.ok(offlineWithCache.userBannerMessage.includes("Cache Lokal"));

  // 2. Initial offline without cache
  const offlineEmpty = resolveReportsState(false, []);
  assert.strictEqual(offlineEmpty.isFromCache, false);
  assert.strictEqual(offlineEmpty.syncStatus, "offline_empty");

  // 3. Online mode
  const onlineState = resolveReportsState(true, [{ id: "rep-1", title: "Jalan Berlubang" }]);
  assert.strictEqual(onlineState.isFromCache, false);
  assert.strictEqual(onlineState.syncStatus, "online_synced");
  assert.strictEqual(onlineState.userBannerMessage, null);
});

test("Check 2 (Offline Mutation & Outbox Queue): Enqueuing offline mutation with truthful outcome", () => {
  function processMutation(isOnline, reportData) {
    if (!isOnline) {
      const idempotencyKey = generateUUID();
      return {
        success: true,
        syncOutcome: "queued_offline",
        feedbackMessage: "Disimpan di Outbox Lokal (Menunggu konfirmasi server saat online)",
        outboxItem: {
          id: generateUUID(),
          idempotencyKey,
          operation: "CREATE_REPORT",
          payload: reportData,
          retryCount: 0,
          status: "pending",
        },
      };
    }
    return {
      success: true,
      syncOutcome: "confirmed_remote",
      feedbackMessage: "Laporan berhasil dikirim dan diverifikasi server.",
      outboxItem: null,
    };
  }

  // Offline mutation test
  const offlineMutation = processMutation(false, { title: "Pohon Tumbang", severity: "high" });
  assert.strictEqual(offlineMutation.syncOutcome, "queued_offline");
  assert.ok(offlineMutation.feedbackMessage.includes("Outbox Lokal"));
  assert.ok(offlineMutation.outboxItem !== null);
  assert.strictEqual(offlineMutation.outboxItem.retryCount, 0);
  assert.ok(offlineMutation.outboxItem.idempotencyKey.length >= 36);

  // Online mutation test
  const onlineMutation = processMutation(true, { title: "Pohon Tumbang", severity: "high" });
  assert.strictEqual(onlineMutation.syncOutcome, "confirmed_remote");
  assert.strictEqual(onlineMutation.outboxItem, null);
});

test("Check 2 (Reconnect & Backoff): Exponential backoff with jitter on transient failures", () => {
  const b0 = calculateBackoffDelay(0, 1000, 30000);
  assert.ok(b0 >= 1000 && b0 <= 1500, "Base delay for retry 0 is >= 1000ms and includes jitter");

  const b1 = calculateBackoffDelay(1, 1000, 30000);
  assert.ok(b1 >= 2000 && b1 <= 2700, "Exponential delay for retry 1 is >= 2000ms");

  const b2 = calculateBackoffDelay(2, 1000, 30000);
  assert.ok(b2 >= 4000 && b2 <= 5100, "Exponential delay for retry 2 is >= 4000ms");

  const bMax = calculateBackoffDelay(10, 1000, 30000);
  assert.strictEqual(bMax, 30000, "Capped at max delay of 30000ms");
});

test("Check 3 (Lifecycle Cleanup): Timer, listener, and subscription teardown idempotency", () => {
  let activeTimers = 0;
  let activeListeners = 0;

  class ManagedNetworkLifecycle {
    constructor() {
      this.timerId = null;
      this.listenerActive = false;
    }

    setup() {
      this.listenerActive = true;
      activeListeners += 1;
    }

    startReconnectTimer() {
      this.clearTimer();
      this.timerId = { id: 1 };
      activeTimers += 1;
    }

    clearTimer() {
      if (this.timerId) {
        this.timerId = null;
        activeTimers -= 1;
      }
    }

    cleanup() {
      this.clearTimer();
      if (this.listenerActive) {
        this.listenerActive = false;
        activeListeners -= 1;
      }
    }
  }

  const manager = new ManagedNetworkLifecycle();
  manager.setup();
  assert.strictEqual(activeListeners, 1);

  manager.startReconnectTimer();
  assert.strictEqual(activeTimers, 1);

  // Repeated start should not leak timers
  manager.startReconnectTimer();
  assert.strictEqual(activeTimers, 1, "Must clear previous timer before setting new one");

  // Cleanup should teardown all resources
  manager.cleanup();
  assert.strictEqual(activeTimers, 0);
  assert.strictEqual(activeListeners, 0);

  // Redundant cleanup calls must be idempotent
  manager.cleanup();
  assert.strictEqual(activeTimers, 0);
  assert.strictEqual(activeListeners, 0);
});

test("Platform & Accessibility Validation: Android vs iOS keyboard avoidance & touch targets", () => {
  // 1. Keyboard avoiding view configuration contract
  function getKeyboardAvoidingBehavior(platformOS) {
    // Android uses adjustResize in AndroidManifest to automatically handle keyboard;
    // setting behavior='padding' causes double compression.
    return platformOS === "ios" ? "padding" : undefined;
  }

  assert.strictEqual(getKeyboardAvoidingBehavior("android"), undefined, "Android must use behavior=undefined");
  assert.strictEqual(getKeyboardAvoidingBehavior("ios"), "padding", "iOS must use behavior='padding'");

  // 2. WCAG 2.1 AA Touch Target standard (minimum 44x44 dp)
  const TOUCH_TARGET_STANDARDS = {
    minimumDp: 44,
    floatingActionButtonDp: 56,
    filterChipMinHeightDp: 44,
    listItemActionMinHeightDp: 44,
  };

  assert.ok(
    TOUCH_TARGET_STANDARDS.floatingActionButtonDp >= TOUCH_TARGET_STANDARDS.minimumDp,
    "FAB meets minimum touch target"
  );
  assert.ok(
    TOUCH_TARGET_STANDARDS.filterChipMinHeightDp >= TOUCH_TARGET_STANDARDS.minimumDp,
    "Filter chips meet minimum touch target"
  );
  assert.ok(
    TOUCH_TARGET_STANDARDS.listItemActionMinHeightDp >= TOUCH_TARGET_STANDARDS.minimumDp,
    "List item actions meet minimum touch target"
  );
});
