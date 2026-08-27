import {
  COVER_PRESETS,
  coverPhotoValue,
  coverValueToPersist,
  presetFromCoverPhoto,
  tileCover,
} from '../DefaultCoverPhotos';

// The two cover-bearing forms (Settings' profile cover, the wishlist form's
// image_url cover) both build the value they persist from a chosen preset and
// a pending upload through this one function — the pure heart of "the form
// sends the cover it renders". Pin its precedence so neither form can drift.
describe('coverValueToPersist', () => {
  it('prefers a chosen preset over a fresh upload', () => {
    expect(coverValueToPersist('preset:sunset-bliss', 'https://b.s3/x.jpg')).toBe(
      'preset:sunset-bliss'
    );
  });

  it('uses a fresh upload when no preset is chosen', () => {
    expect(coverValueToPersist(null, 'https://b.s3/x.jpg')).toBe('https://b.s3/x.jpg');
  });

  it('persists a chosen preset even with no upload', () => {
    expect(coverValueToPersist('preset:ocean-breeze', null)).toBe('preset:ocean-breeze');
  });

  it('returns undefined when nothing was picked or uploaded (leave it untouched)', () => {
    // undefined, not null: the caller spreads it into a body, and an omitted
    // field must not rewrite a cover the user left alone on an edit.
    expect(coverValueToPersist(null, null)).toBeUndefined();
  });
});

describe('coverPhotoValue / presetFromCoverPhoto round-trip', () => {
  it('encodes a preset as preset:<id> and decodes it back', () => {
    const preset = COVER_PRESETS[0];
    const encoded = coverValueToPersist(coverPhotoValue(preset), null);
    expect(encoded).toBe(`preset:${preset.id}`);
    expect(presetFromCoverPhoto(encoded)).toEqual(preset);
  });

  it('treats an uploaded image URL as not a preset', () => {
    expect(presetFromCoverPhoto('https://b.s3.us-west-2.amazonaws.com/x.jpg')).toBeUndefined();
  });
});

// The image-forward wishlist tile (My Stuff / profile grids) must never hand a
// `preset:<id>` string to <Image> — RN throws "No suitable URL request handler
// found for preset:…" (the My Stuff grid red-box the Maestro run surfaced).
// tileCover is the one classifier that keeps the tile from re-deciding
// preset-vs-URL inline and reintroducing that bug.
describe('tileCover', () => {
  it('resolves a preset cover to its gradient, never an image URL', () => {
    const preset = COVER_PRESETS.find((p) => p.id === 'sunset-bliss')!;
    expect(tileCover('preset:sunset-bliss')).toEqual({ kind: 'preset', colors: preset.colors });
  });

  it('resolves a custom uploaded URL to an image', () => {
    expect(tileCover('https://b.s3.us-west-2.amazonaws.com/x.jpg')).toEqual({
      kind: 'image',
      imageUrl: 'https://b.s3.us-west-2.amazonaws.com/x.jpg',
    });
  });

  it('falls back to the glyph when there is no cover', () => {
    expect(tileCover(null)).toEqual({ kind: 'glyph' });
    expect(tileCover(undefined)).toEqual({ kind: 'glyph' });
    expect(tileCover('')).toEqual({ kind: 'glyph' });
  });

  it('never emits a preset:<id> string as an image uri', () => {
    for (const preset of COVER_PRESETS) {
      const cover = tileCover(`preset:${preset.id}`);
      expect(cover.kind).toBe('preset');
      // guards the exact RN crash: no branch hands preset:<id> to <Image>
      expect(JSON.stringify(cover)).not.toContain('preset:');
    }
  });
});
