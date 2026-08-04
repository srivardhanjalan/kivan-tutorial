import { useState } from 'react';
import { pickAndUploadImage } from '../services/ImageUploadService';
import type { ResourceType } from '../services/api';
import useAsyncAction from './useAsyncAction';

/**
 * Client state for one optional image slot.
 *
 * The photo lifecycle is backend-owned: the upload lands under S3's
 * `pending/` prefix, and saving the record claims it into the permanent
 * keyspace (an S3 lifecycle rule expires anything never claimed). The client
 * only uploads and previews.
 *
 * `changedUrl` is the permanent URL to persist, non-null only when an upload
 * replaced the seeded image — the hook holds the saved URL it was seeded
 * with, so callers never re-track it just to ask "did this change?".
 * `imagePreview` is the local URI shown the instant an upload succeeds — that
 * preview appearing IS the success feedback, so there is no toast on success
 * (only on failure).
 *
 * `initialUrl` seeds the slot when the caller already has the saved image at
 * mount (the edit forms' route params); Settings fetches its user async and
 * seeds later via `setInitialImage` instead.
 */
export function usePendingImageUpload(
  resourceType: ResourceType,
  errorMessage: string,
  initialUrl: string | null = null
) {
  const { loading: isUploading, run } = useAsyncAction();
  const [seedUrl, setSeedUrl] = useState<string | null>(initialUrl);
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl);
  const [imagePreview, setImagePreview] = useState<string | null>(initialUrl);

  const handleUpload = () =>
    run(async () => {
      const result = await pickAndUploadImage(resourceType);
      if (!result) {
        return; // permission denied or user cancelled
      }
      setImageUrl(result.photo_url);
      setImagePreview(result.local_uri);
    }, errorMessage);

  /** Seed the field with the already-saved image once it loads. */
  const setInitialImage = (url: string) => {
    setSeedUrl(url);
    setImageUrl(url);
    setImagePreview(url);
  };

  return {
    changedUrl: imageUrl !== seedUrl ? imageUrl : null,
    imagePreview,
    isUploading,
    handleUpload,
    setInitialImage,
  };
}

/**
 * One image slot's whole hook state — what an ImageUploadField renders.
 * Derived from the hook so the two never drift apart.
 */
export type PendingImageUpload = ReturnType<typeof usePendingImageUpload>;
