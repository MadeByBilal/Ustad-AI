/**
 * Shared layout constants for bottom navigation clearance.
 *
 * The BottomNav is ~56px tall (py-2.5*2 + icon 20px + label 12px + gap).
 * On notched devices, safe-area-inset-bottom adds ~34px (iPhone X+).
 *
 * Usage:
 *   - CSS: use `.page-bottom-safe` or `.page-bottom-safe-inline` utility classes
 *   - Inline styles / computed values: use BOTTOM_SAFE_OFFSET or BOTTOM_NAV_HEIGHT
 */

/** Approximate BottomNav body height in px (without safe area). */
export const BOTTOM_NAV_HEIGHT = 56;

/**
 * Combined offset: BottomNav height + safe-area-inset-bottom.
 * Use as padding-bottom on any scrollable container that sits above the bottom nav.
 * Returns a CSS calc() string for use in style={{ paddingBottom: BOTTOM_SAFE_OFFSET }}.
 *
 * Example: style={{ paddingBottom: BOTTOM_SAFE_OFFSET }}
 */
export const BOTTOM_SAFE_OFFSET = `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`;

/**
 * For fixed-position elements that sit above the bottom nav (e.g. sticky CTAs).
 * Sets the `bottom` CSS property to clear the nav + safe area.
 */
export const BOTTOM_NAV_BOTTOM_OFFSET = `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`;
