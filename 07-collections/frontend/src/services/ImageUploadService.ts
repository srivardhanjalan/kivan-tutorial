import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import {
  getSignedUploadUrl,
  uploadToS3,
  type ResourceType,
  type FileExtension,
} from './api';

export interface ImageUploadResult {
  /** Permanent URL to persist on the user record */
  photo_url: string;
  /** Local file URI — an instant preview while the save round-trips */
  local_uri: string;
}

/** Profile photos crop square; covers crop to a wide banner. */
const ASPECT_BY_TYPE: Record<ResourceType, [number, number]> = {
  profile_photo: [1, 1],
  cover_photo: [16, 9],
};

/**
 * Pick an image from the library and upload it to S3.
 *
 * Flow: media-library permission → pick + crop → detect extension/MIME →
 * ask the backend for a presigned URL → PUT the bytes to S3 → hand back the
 * permanent `photo_url` (to save) and the `local_uri` (to preview). Returns
 * null when the user cancels either the permission prompt or the picker.
 */
export async function pickAndUploadImage(
  resourceType: ResourceType
): Promise<ImageUploadResult | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission needed',
      'Allow access to your photos to set your profile and cover photo.'
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: ASPECT_BY_TYPE[resourceType],
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  const fileUri = result.assets[0].uri;
  const extension = fileExtensionOf(fileUri);

  const signed = await getSignedUploadUrl({
    resource_type: resourceType,
    file_extension: extension,
  });

  // Our FileExtension values are exactly the MIME subtypes, so the
  // Content-Type is `image/<extension>` with no mapping table.
  await uploadToS3(signed.upload_url, fileUri, `image/${extension}`);

  return { photo_url: signed.photo_url, local_uri: fileUri };
}

/** Map a file URI's suffix to an accepted extension (defaults to jpeg). */
function fileExtensionOf(uri: string): FileExtension {
  switch (uri.split('.').pop()?.toLowerCase()) {
    case 'png':
      return 'png';
    case 'gif':
      return 'gif';
    case 'webp':
      return 'webp';
    default:
      return 'jpeg';
  }
}
