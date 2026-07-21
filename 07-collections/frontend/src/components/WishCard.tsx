import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ArtTile from './ArtTile';
import ImagePlaceholderGlyph from './ImagePlaceholderGlyph';
import TileCaption from './TileCaption';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import { formatCost } from '../utils/formatCost';
import type { Wish } from '../services/api';

interface WishCardProps {
  wish: Wish;
  onPress: () => void;
}

/**
 * A wish as an image-led tile: the photo fills the art block (a placeholder
 * icon when there is none), name and cost sit below. A completed wish dims
 * and wears a check — the got-it state read at a glance.
 */
const WishCard: React.FC<WishCardProps> = ({ wish, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={Opacity.pressed}
    accessibilityRole="button"
    accessibilityLabel={wish.name}
    style={wish.completed && styles.completed}
  >
    <ArtTile
      color={Colors.subtleFill}
      imageUrl={wish.image_url}
      placeholder={<ImagePlaceholderGlyph size={Spacing.tileGlyphSize} />}
    >
      {wish.completed && (
        <View style={[CommonScreenStyles.center, styles.checkBadge]}>
          <Ionicons name="checkmark-circle" size={26} color={Colors.success} />
        </View>
      )}
    </ArtTile>
    <TileCaption>{wish.name}</TileCaption>
    {wish.cost !== null && <Text style={styles.cost}>{formatCost(wish.cost)}</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  completed: {
    opacity: Opacity.disabled,
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
  },
  cost: {
    ...Typography.bodySecondary,
    // A hairline gap under the name — smaller than the spacing scale on purpose
    marginTop: 2,
  },
});

export default WishCard;
