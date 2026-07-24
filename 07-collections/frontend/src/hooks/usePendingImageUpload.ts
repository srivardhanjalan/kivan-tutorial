import { useState } from 'react';
import { pickAndUploadImage } from '../services/ImageUploadService';
import type { ResourceType } from '../services/api';
import useAsyncAction from './useAsyncAction';

/**
 * Client state for one optional image slot on the Settings screen.
 *
 * The photo lifecycle is backend-owned: the upload lands under S3's
 * `pending/` prefix, and saving the profile claims it into the permanent
 * keyspace (an S3 lifecycle rule expires anything never claimed). The client
 * only uploads and previews.
 *
 * `imageUrl` is the permanent URL to persist; `imagePreview` is the local URI
 * shown the instant an upload succeeds — that preview appearing IS the success
 * feedback, so there is no toast on success (only on failure).
 */
export function usePendingImageUpload(
  resourceType: ResourceType,
  errorMessage: string
) {
  const { loading: isUploading, run } = useAsyncAction();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleUpload = () =>
    run(async () => {
      const result = await pickAndUploadImage(resourceType);
      if (!result) {
        return; // permission denied or user cancelled
      }
      setImageUrl(result.photo_url);
      setImagePreview(result.local_uri);
    }, errorMessage);

  /** Seed the field with the already-saved image on load. */
  const setInitialImage = (url: string) => {
    setImageUrl(url);
    setImagePreview(url);
  };

  return { imageUrl, imagePreview, isUploading, handleUpload, setInitialImage };
}
