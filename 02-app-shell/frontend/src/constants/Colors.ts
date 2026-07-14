/**
 * The palette. Every color in the app comes from here — screens never
 * invent hex values. Tokens are added when a screen first needs them,
 * never in advance.
 */
export default {
  primary: '#FF385C',
  dark: '#1A1A1A',
  grey: '#5E5D5E',
  lightGrey: '#E0E0E0',
  white: '#fff',
  /** Default screen background */
  background: '#FDFFFF',
  /** Light grey surface for inputs, chips, placeholders */
  surface: '#F5F5F7',
  /** Standard hairline border */
  border: '#E5E7EB',
  /** Subtle translucent border used on glass cards/pills */
  borderSubtle: 'rgba(0, 0, 0, 0.06)',
  /** Primary body text (near-black) */
  textPrimary: '#1D1D1F',
  /** Secondary text */
  textSecondary: '#6E6E73',
  /** Muted/tertiary text, placeholders */
  textMuted: '#8E8E93',
  /** Destructive actions */
  danger: '#EF4444',
  /** Success/confirmation */
  success: '#34C759',
};
