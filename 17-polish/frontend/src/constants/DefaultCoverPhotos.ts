/**
 * The default cover-photo presets: named diagonal gradients a profile (or a
 * wishlist) wears when it carries no custom cover image. Part of the tonal,
 * image-led design language, alongside the life-event pastels.
 *
 * The stops are DATA, not `Colors` tokens: a preset is a fixed catalog entry
 * the cover picker offers, three gradient stops with no semantic meaning
 * elsewhere in the app — exactly the shape lifeEventPastels.ts already uses for
 * its washes.
 */
export interface CoverPreset {
  /** Stable slug. A chosen preset is stored as `preset:<id>` in the existing
      `cover_photo` string field, so the choice round-trips with no backend
      change (the field already round-trips a custom image URL). */
  id: string;
  name: string;
  /** Three gradient stops, top-left to bottom-right. */
  colors: [string, string, string];
}

export const COVER_PRESETS: CoverPreset[] = [
  { id: 'purple-dream', name: 'Purple Dream', colors: ['#8B5CF6', '#6366F1', '#3B82F6'] },
  { id: 'sunset-bliss', name: 'Sunset Bliss', colors: ['#F59E0B', '#EF4444', '#EC4899'] },
  { id: 'ocean-breeze', name: 'Ocean Breeze', colors: ['#06B6D4', '#0EA5E9', '#3B82F6'] },
  { id: 'forest-mist', name: 'Forest Mist', colors: ['#10B981', '#059669', '#047857'] },
  { id: 'rose-garden', name: 'Rose Garden', colors: ['#EC4899', '#DB2777', '#BE185D'] },
  { id: 'lavender-fields', name: 'Lavender Fields', colors: ['#C084FC', '#A78BFA', '#8B5CF6'] },
  { id: 'golden-hour', name: 'Golden Hour', colors: ['#FBBF24', '#F59E0B', '#D97706'] },
  { id: 'midnight-sky', name: 'Midnight Sky', colors: ['#6366F1', '#4F46E5', '#4338CA'] },
  { id: 'cherry-blossom', name: 'Cherry Blossom', colors: ['#FCA5A5', '#F87171', '#EF4444'] },
  { id: 'mint-fresh', name: 'Mint Fresh', colors: ['#6EE7B7', '#34D399', '#10B981'] },
  { id: 'cosmic-purple', name: 'Cosmic Purple', colors: ['#A78BFA', '#818CF8', '#6366F1'] },
  { id: 'coral-reef', name: 'Coral Reef', colors: ['#FB923C', '#F97316', '#EA580C'] },
  { id: 'arctic-aurora', name: 'Arctic Aurora', colors: ['#67E8F9', '#22D3EE', '#06B6D4'] },
  { id: 'peachy-keen', name: 'Peachy Keen', colors: ['#FDBA74', '#FB923C', '#F97316'] },
  { id: 'berry-smoothie', name: 'Berry Smoothie', colors: ['#F472B6', '#EC4899', '#DB2777'] },
];

/** The prefix marking a `cover_photo` value as a preset choice (vs an image URL). */
const PRESET_PREFIX = 'preset:';

/** The `cover_photo` string a chosen preset stores. */
export function coverPhotoValue(preset: CoverPreset): string {
  return `${PRESET_PREFIX}${preset.id}`;
}

/** The preset a saved `cover_photo` names, if it names one (else undefined). */
export function presetFromCoverPhoto(coverPhoto: string | null | undefined): CoverPreset | undefined {
  if (!coverPhoto?.startsWith(PRESET_PREFIX)) return undefined;
  const id = coverPhoto.slice(PRESET_PREFIX.length);
  return COVER_PRESETS.find((p) => p.id === id);
}

/**
 * The preset an owner falls back to when they have chosen none — a stable
 * gradient derived from their id, so a coverless profile/wishlist still reads
 * as a designed band, not a flat grey, and always the same one.
 */
export function coverPresetForOwner(ownerId: string): CoverPreset {
  const hash = [...ownerId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return COVER_PRESETS[hash % COVER_PRESETS.length];
}

/** What a `cover_photo` value resolves to for rendering. */
export interface ResolvedCover {
  /** A custom uploaded image to fill the band, or null to use the gradient. */
  imageUrl: string | null;
  /** The gradient stops (a chosen preset's, or the owner's deterministic one). */
  colors: [string, string, string];
}

/**
 * Resolve a stored `cover_photo` against its owner id into what to render. The
 * one field carries three cases: a `preset:<id>` (a chosen gradient), a custom
 * image URL (the existing upload), or empty (the owner's deterministic
 * gradient). The custom image rides over that deterministic gradient, which
 * shows only while the image loads or if it fails.
 */
export function resolveCover(coverPhoto: string | null | undefined, ownerId: string): ResolvedCover {
  const fallback = coverPresetForOwner(ownerId).colors;
  const preset = presetFromCoverPhoto(coverPhoto);
  if (preset) return { imageUrl: null, colors: preset.colors };
  if (coverPhoto) return { imageUrl: coverPhoto, colors: fallback };
  return { imageUrl: null, colors: fallback };
}
