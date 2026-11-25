/**
 * Civic Pulse - Pertemuan 12
 * Responsive Breakpoints & Layout Constraints
 * Role: Anggota 1 (Lead System Architect)
 */

export const BREAKPOINTS = {
  compact: 0,     // Mobile portrait
  medium: 600,    // Large mobile landscape / small tablet
  tablet: 768,    // iPad / Android tablet portrait
  expanded: 1024, // Tablet landscape / Desktop web
} as const;

export const LAYOUT_CONSTRAINTS = {
  maxContentWidth: 960,
  maxCardWidth: 640,
  maxModalWidth: 540,
  minTouchTarget: 44, // WCAG AA requirement for interactive elements
} as const;

/**
 * Validates if the given dimensions constitute landscape orientation
 */
export function isLandscapeOrientation(width: number, height: number): boolean {
  return width > height;
}

/**
 * Determines device classification based on viewport width
 */
export function getDeviceTier(width: number): "compact" | "medium" | "tablet" | "expanded" {
  if (width >= BREAKPOINTS.expanded) return "expanded";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  if (width >= BREAKPOINTS.medium) return "medium";
  return "compact";
}

/**
 * Calculates adaptive horizontal padding based on screen width
 */
export function getResponsivePadding(width: number): number {
  if (width >= BREAKPOINTS.expanded) return 32;
  if (width >= BREAKPOINTS.tablet) return 24;
  if (width >= BREAKPOINTS.medium) return 20;
  return 16;
}
