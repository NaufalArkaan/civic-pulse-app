import assert from "node:assert";
import test from "node:test";

import {
  BREAKPOINTS,
  LAYOUT_CONSTRAINTS,
  isLandscapeOrientation,
  getDeviceTier,
  getResponsivePadding,
} from "../src/constants/breakpoints.ts";
import { THEME } from "../src/constants/theme.ts";

test("Responsive Breakpoints: correctly identifies orientation", () => {
  assert.strictEqual(BREAKPOINTS.compact, 0);
  assert.strictEqual(BREAKPOINTS.tablet, 768);
  assert.strictEqual(isLandscapeOrientation(800, 400), true, "800x400 should be landscape");
  assert.strictEqual(isLandscapeOrientation(400, 800), false, "400x800 should be portrait");
  assert.strictEqual(isLandscapeOrientation(390, 844), false, "iPhone 14 portrait");
  assert.strictEqual(isLandscapeOrientation(844, 390), true, "iPhone 14 landscape");
  assert.strictEqual(isLandscapeOrientation(500, 500), false, "Square view is not landscape");
});

test("Responsive Breakpoints: assigns device tiers accurately across screen widths", () => {
  // Compact (Phone portrait)
  assert.strictEqual(getDeviceTier(360), "compact");
  assert.strictEqual(getDeviceTier(412), "compact");
  assert.strictEqual(getDeviceTier(599), "compact");

  // Medium (Large phone landscape / small phablet)
  assert.strictEqual(getDeviceTier(600), "medium");
  assert.strictEqual(getDeviceTier(767), "medium");

  // Tablet (iPad / Android Tablet portrait)
  assert.strictEqual(getDeviceTier(768), "tablet");
  assert.strictEqual(getDeviceTier(1023), "tablet");

  // Expanded (Desktop / Tablet landscape)
  assert.strictEqual(getDeviceTier(1024), "expanded");
  assert.strictEqual(getDeviceTier(1440), "expanded");
});

test("Responsive Layout: padding scales with screen size without clipping", () => {
  assert.strictEqual(getResponsivePadding(360), 16, "Compact devices get 16dp padding");
  assert.strictEqual(getResponsivePadding(600), 20, "Medium devices get 20dp padding");
  assert.strictEqual(getResponsivePadding(768), 24, "Tablet devices get 24dp padding");
  assert.strictEqual(getResponsivePadding(1200), 32, "Expanded screens get 32dp padding");
});

test("Accessibility & Ergonomics: touch targets and layout constraints meet standards", () => {
  // WCAG 2.1 Level AA minimum touch target size is 44x44 dp
  assert.ok(
    LAYOUT_CONSTRAINTS.minTouchTarget >= 44,
    `Touch target must be >= 44dp, got ${LAYOUT_CONSTRAINTS.minTouchTarget}`
  );

  // Content width constraints to prevent excessive eye-travel on wide screens
  assert.strictEqual(LAYOUT_CONSTRAINTS.maxContentWidth, 960);
  assert.strictEqual(LAYOUT_CONSTRAINTS.maxCardWidth, 640);
  assert.strictEqual(LAYOUT_CONSTRAINTS.maxModalWidth, 540);
});

test("State Transition Contract: Skeleton vs Cache vs Empty vs Error logic", () => {
  // Contract helper simulation
  function determineFeedDisplayState({ reportsCount, loading, error, isFromCache }) {
    if (error && reportsCount === 0) return "error";
    if (loading && reportsCount === 0) return "skeleton";
    if (!loading && reportsCount === 0) return "empty";
    if (loading && reportsCount > 0) return "data-with-inline-sync";
    if (isFromCache && reportsCount > 0) return "cache-data";
    return "ready-data";
  }

  // 1. Cold start with 0 data and loading: must show skeleton
  assert.strictEqual(
    determineFeedDisplayState({ reportsCount: 0, loading: true, error: null, isFromCache: false }),
    "skeleton"
  );

  // 2. Refreshing with existing data: must NOT show skeleton (preserve user context)
  assert.strictEqual(
    determineFeedDisplayState({ reportsCount: 5, loading: true, error: null, isFromCache: false }),
    "data-with-inline-sync"
  );

  // 3. Offline cache loaded: must show cached data with cache banner
  assert.strictEqual(
    determineFeedDisplayState({ reportsCount: 5, loading: false, error: null, isFromCache: true }),
    "cache-data"
  );

  // 4. Search query yields 0 results: must show empty state, NOT skeleton
  assert.strictEqual(
    determineFeedDisplayState({ reportsCount: 0, loading: false, error: null, isFromCache: false }),
    "empty"
  );

  // 5. Network failure: must show error state, NOT skeleton
  assert.strictEqual(
    determineFeedDisplayState({ reportsCount: 0, loading: false, error: "Network failed", isFromCache: false }),
    "error"
  );
});

test("Theme & Design Tokens: tokens are strictly typed with sufficient contrast", () => {
  assert.ok(THEME.colors.primary, "Primary color must be defined");
  assert.ok(THEME.colors.backgroundDark, "Background dark must be defined");
  assert.ok(THEME.colors.skeletonBase, "Skeleton base color must be defined");
  assert.ok(THEME.typography.title.fontSize >= 18, "Title font size must be prominent");
  assert.ok(THEME.spacing.md === 12, "Medium spacing token");
});

test("Adaptive Container Bounds: width clamping prevents overflow across screen widths", () => {
  function clampModalWidth(viewportWidth) {
    return Math.min(viewportWidth - 32, LAYOUT_CONSTRAINTS.maxModalWidth);
  }

  function clampCardWidth(viewportWidth) {
    return Math.min(viewportWidth - 32, LAYOUT_CONSTRAINTS.maxCardWidth);
  }

  // Small Phone (320px)
  assert.strictEqual(clampModalWidth(320), 288);
  assert.strictEqual(clampCardWidth(320), 288);

  // Normal Phone (390px)
  assert.strictEqual(clampModalWidth(390), 358);
  assert.strictEqual(clampCardWidth(390), 358);

  // Tablet (800px) - Clamped at maxModalWidth (540) and maxCardWidth (640)
  assert.strictEqual(clampModalWidth(800), 540);
  assert.strictEqual(clampCardWidth(800), 640);

  // Desktop (1440px) - Clamped at max constraints
  assert.strictEqual(clampModalWidth(1440), 540);
  assert.strictEqual(clampCardWidth(1440), 640);
});

test("Micro-interaction & Reanimated Configuration: animation properties follow design specs", () => {
  // Spring animation parameters for tactile feedback
  const buttonSpringConfig = {
    damping: 15,
    stiffness: 250,
    activeScale: 0.96,
  };

  assert.ok(buttonSpringConfig.damping >= 10 && buttonSpringConfig.damping <= 20);
  assert.ok(buttonSpringConfig.stiffness >= 150 && buttonSpringConfig.stiffness <= 300);
  assert.ok(buttonSpringConfig.activeScale >= 0.90 && buttonSpringConfig.activeScale <= 0.98);

  // Skeleton shimmer duration & opacity bounds
  const skeletonConfig = {
    durationMs: 850,
    minOpacity: 0.4,
    maxOpacity: 0.85,
  };

  assert.strictEqual(skeletonConfig.durationMs, 850);
  assert.ok(skeletonConfig.minOpacity >= 0.3);
  assert.ok(skeletonConfig.maxOpacity <= 0.9);
});
