import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import { CommonScreenStyles } from '../constants/ScreenStyles';

/** The one list-row avatar diameter: every list row that shows a person
    (a follow row, a notification row) renders the avatar at this size, so
    rows can't drift apart one metric at a time. */
export const LIST_ROW_AVATAR_SIZE = 48;

interface AvatarProps {
  imageUrl?: string | null;
  /** The name the initial falls back to when there's no image */
  name: string;
  size: number;
}

/**
 * A circular user avatar: the profile image when one is set, else the name's
 * first initial on a soft disc. The one spelling of "show a user's face":
 * search rows, follow lists, and the profile header all render through it, so
 * the fallback can't drift between them.
 */
const Avatar: React.FC<AvatarProps> = ({ imageUrl, name, size }) => {
  // Any radius ≥ half the box reads as a full circle (BorderRadius.full = 100)
  const shape = { width: size, height: size, borderRadius: BorderRadius.full };

  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={shape} accessibilityIgnoresInvertColors />;
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[CommonScreenStyles.center, styles.fallback, shape]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: Colors.subtleFill,
  },
  initial: {
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});

export default Avatar;
