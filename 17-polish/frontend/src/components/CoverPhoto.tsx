import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import { Spacing } from '../constants/ScreenStyles';
import { resolveCover } from '../constants/DefaultCoverPhotos';

interface CoverPhotoProps {
  /** Whose cover this is — seeds the deterministic default gradient so a
      coverless owner still gets a stable, designed band. */
  ownerId: string;
  /** The stored cover value: a custom image URL, a `preset:<id>`, or null. */
  coverPhoto?: string | null;
  height?: number;
  borderRadius?: number;
  /** Controls the caller floats on the band (a love heart, life-event badge). */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The cover band shared by the profile, home, and wishlist surfaces: a rounded
 * image-or-gradient banner the caller floats controls on. A custom uploaded
 * image fills it; with none (or on load failure) it falls to the owner's
 * gradient — a chosen preset, else the deterministic default. The one place a
 * cover_photo string turns into a rendered band, so the three surfaces can't
 * drift.
 */
const CoverPhoto: React.FC<CoverPhotoProps> = ({
  ownerId,
  coverPhoto,
  height = Spacing.detailHeroHeight,
  borderRadius = BorderRadius.xl,
  children,
  style,
}) => {
  const [imageError, setImageError] = useState(false);
  useEffect(() => setImageError(false), [coverPhoto]);

  const { imageUrl, colors } = resolveCover(coverPhoto, ownerId);
  const showImage = imageUrl && !imageError;

  return (
    <View style={[styles.band, { height, borderRadius }, style]}>
      {showImage ? (
        <Image
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  band: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.subtleFill,
  },
});

export default CoverPhoto;
