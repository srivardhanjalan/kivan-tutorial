import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CoverPhoto from './CoverPhoto';
import Avatar from './Avatar';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

/** The avatar diameter that overlaps the cover's foot (the band height is the
    shared Spacing.coverBandHeight token). */
const AVATAR_SIZE = 72;

interface CoverProfileHeaderProps {
  /** Whose header this is — seeds the deterministic cover gradient. */
  ownerId: string;
  coverPhoto?: string | null;
  avatarUrl?: string | null;
  name: string;
  /**
   * Bleed the cover to the screen edges (the public profile) rather than the
   * inset rounded card (Home). The avatar and name stay on the content edge.
   */
  bleed?: boolean;
  /** A control floated on the cover's top-right: the settings button on Home,
      the follow heart on a profile. */
  overlay?: React.ReactNode;
}

/**
 * The cover-band profile header shared by Home and the public profile: a cover
 * photo (or the owner's gradient) with the avatar overlapping its foot and the
 * display name beside it, plus an optional control floated on the cover. Home
 * insets the band as a rounded card; a profile bleeds it edge-to-edge.
 */
const CoverProfileHeader: React.FC<CoverProfileHeaderProps> = ({
  ownerId,
  coverPhoto,
  avatarUrl,
  name,
  bleed = false,
  overlay,
}) => (
  <View style={styles.container}>
    <CoverPhoto
      ownerId={ownerId}
      coverPhoto={coverPhoto}
      height={Spacing.coverBandHeight}
      borderRadius={bleed ? 0 : BorderRadius.xl}
      style={bleed ? styles.bleed : undefined}
    >
      {overlay && <View style={styles.overlay}>{overlay}</View>}
    </CoverPhoto>

    <View style={styles.identity}>
      <View style={styles.avatarRing}>
        <Avatar imageUrl={avatarUrl} name={name} size={AVATAR_SIZE} />
      </View>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  bleed: {
    marginHorizontal: -Spacing.contentHorizontal,
  },
  overlay: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.md,
    // Lift the avatar so it overlaps the cover's foot.
    marginTop: -AVATAR_SIZE / 2,
    paddingHorizontal: Spacing.sm,
  },
  avatarRing: {
    borderRadius: BorderRadius.full,
    borderWidth: 4,
    borderColor: Colors.background,
    backgroundColor: Colors.background,
  },
  name: {
    ...Typography.sectionTitle,
    flexShrink: 1,
    marginBottom: Spacing.sm,
  },
});

export default CoverProfileHeader;
