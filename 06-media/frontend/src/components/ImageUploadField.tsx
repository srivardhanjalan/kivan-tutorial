import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { Spacing } from '../constants/ScreenStyles';

interface ImageUploadFieldProps {
  label: string;
  imagePreview: string | null;
  isUploading: boolean;
  onUpload: () => void;
}

/** Label + current/previewed image (or an empty placeholder) + a camera
    button that opens the picker. Purely presentational — the pending-upload
    state lives in usePendingImageUpload. */
const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  imagePreview,
  isUploading,
  onUpload,
}) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.imageContainer}>
      {imagePreview ? (
        <Image source={{ uri: imagePreview }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Ionicons name="image-outline" size={40} color={Colors.grey} />
          <Text style={styles.placeholderText}>No image selected</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={onUpload}
        disabled={isUploading}
        activeOpacity={Opacity.pressed}
        accessibilityRole="button"
        accessibilityLabel={imagePreview ? `Change ${label}` : `Add ${label}`}
      >
        {isUploading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Ionicons name="camera" size={20} color={Colors.white} />
            <Text style={styles.uploadButtonText}>
              {imagePreview ? 'Change Image' : 'Add Image'}
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
  label: {
    ...Typography.bodySecondaryStrong,
    marginBottom: Spacing.sm,
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
