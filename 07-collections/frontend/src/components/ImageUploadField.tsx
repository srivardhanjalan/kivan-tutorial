import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { Spacing } from '../constants/ScreenStyles';
import FieldLabel from './FieldLabel';
import ImagePlaceholderGlyph from './ImagePlaceholderGlyph';
import type { PendingImageUpload } from '../hooks/usePendingImageUpload';

interface ImageUploadFieldProps {
  label: string;
  /** One image slot's whole hook state — the field renders whatever state it's in */
  upload: PendingImageUpload;
}

/** Label + current/previewed image (or an empty placeholder) + a camera button
    that opens the picker. Purely presentational: it renders whatever state the
    passed usePendingImageUpload hook is in — preview URI, uploading flag, and
    the picker trigger. */
const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ label, upload }) => (
  <View style={styles.container}>
    <FieldLabel>{label}</FieldLabel>
    <View style={styles.imageContainer}>
      {upload.imagePreview ? (
        <Image source={{ uri: upload.imagePreview }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <ImagePlaceholderGlyph size={Spacing.tileGlyphSize} />
          <Text style={styles.placeholderText}>No image selected</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={upload.handleUpload}
        disabled={upload.isUploading}
        activeOpacity={Opacity.pressed}
        accessibilityRole="button"
        accessibilityLabel={upload.imagePreview ? `Change ${label}` : `Add ${label}`}
      >
        {upload.isUploading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Ionicons name="camera" size={20} color={Colors.white} />
            <Text style={styles.uploadButtonText}>
              {upload.imagePreview ? 'Change Image' : 'Add Image'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xxl,
  },
  imageContainer: {
    borderWidth: 1,
    borderColor: Colors.hairline,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  image: {
    width: '100%',
    height: 200,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  placeholderText: {
    ...Typography.bodySecondary,
    marginTop: Spacing.sm,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  uploadButtonText: {
    ...Typography.button,
  },
});

export default ImageUploadField;
