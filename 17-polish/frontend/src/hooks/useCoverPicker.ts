import { useState } from 'react';
import { coverPhotoValue } from '../constants/DefaultCoverPhotos';
import type { CoverPreset } from '../constants/DefaultCoverPhotos';
import type { PendingImageUpload } from './usePendingImageUpload';

/**
 * The preset-or-upload cover picker shared by Settings (the profile cover) and
 * the wishlist form. A cover is set two mutually exclusive ways, last one wins:
 * a chosen gradient preset (`preset:<id>`, held here) or a custom upload (held
 * by the passed image slot). Picking a preset supersedes an upload; the upload
 * button clears any picked preset.
 *
 * `initialPreset` seeds the choice when the saved cover already names a preset
 * (the wishlist edit form seeds it from `image_url`); Settings starts null and
 * seeds the upload slot via `setInitialImage` instead.
 */
export function useCoverPicker(
  upload: PendingImageUpload,
  initialPreset: string | null = null
) {
  const [chosenPreset, setChosenPreset] = useState<string | null>(initialPreset);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  // What the preview band and the save reflect: a just-picked preset, else the
  // upload slot (seeded from the saved cover, updated on a new upload).
  const effectiveCover = chosenPreset ?? upload.imagePreview;

  const pickPreset = (preset: CoverPreset) => {
    setChosenPreset(coverPhotoValue(preset));
    setShowCoverPicker(false);
  };
  const uploadCover = () => {
    setChosenPreset(null);
    upload.handleUpload();
  };

  return {
    /** The picked preset value (`preset:<id>`) or null — pass to
        `coverValueToPersist` at save alongside the upload's `changedUrl`. */
    chosenPreset,
    effectiveCover,
    isUploading: upload.isUploading,
    pickPreset,
    uploadCover,
    showCoverPicker,
    openPicker: () => setShowCoverPicker(true),
    closePicker: () => setShowCoverPicker(false),
  };
}

/** One cover picker's whole state — what a CoverPickerField renders. */
export type CoverPicker = ReturnType<typeof useCoverPicker>;
