/**
 * The palette. Every color in the app comes from here — screens never
 * invent hex values. Tokens are added when a screen first needs them,
 * never in advance.
 */
// The screen background's RGB triplet — the solid color AND the header
// wash both derive from it, so they cannot drift apart
const backgroundRgb = '253, 255, 255';

export default {
  primary: '#FF385C',
  dark: '#1A1A1A',
  grey: '#5E5D5E',
  lightGrey: '#E0E0E0',
  white: '#fff',
  /** Default screen background */
  background: `rgb(${backgroundRgb})`,
  /** The triplet itself — for alpha washes */
  backgroundRgb,
  /** The dark toast/overlay surface */
  toastSurface: 'rgba(28, 28, 30, 0.96)',
  /** Near-opaque white stand-in for glass pills where BlurView is unavailable (Android) */
  glassFallback: 'rgba(255, 255, 255, 0.94)',
  /** Primary body text (near-black) */
  textPrimary: '#1D1D1F',
  /** Secondary text */
  textSecondary: '#6E6E73',
  /** The app-wide pressed/active fill on chrome buttons and tabs */
  pressedFill: 'rgba(0, 0, 0, 0.08)',
  /** Raised input/card surface on the default background */
  surface: '#FFFFFF',
  /** Hairline borders on inputs and outlined buttons */
  hairline: 'rgba(0, 0, 0, 0.08)',
  /** Placeholder/disabled text */
  textMuted: '#A1A1A6',
  /** Soft grey disc behind empty-state icons */
  subtleFill: 'rgba(224, 224, 224, 0.33)',
  /** Success/confirmation */
  success: '#34C759',
  /** Destructive/error */
  danger: '#EF4444',
};
