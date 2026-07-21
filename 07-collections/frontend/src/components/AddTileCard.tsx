import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ArtTile from './ArtTile';
import TileCaption from './TileCaption';
import Colors from '../constants/Colors';
import Opacity from '../constants/Opacity';
import { Spacing } from '../constants/ScreenStyles';

interface AddTileCardProps {
  /** The caption under the tile, and the button's accessibility label */
  label: string;
  onPress: () => void;
}

/** The add-new tile that leads every collection grid — a soft-filled art
    block with a plus, matching the shape and caption position of the cards
    beside it. Serves both "New Wishlist" and "New Wish". */
const AddTileCard: React.FC<AddTileCardProps> = ({ label, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={Opacity.pressed}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <ArtTile color={Colors.subtleFill}>
      <Ionicons name="add-circle" size={Spacing.tileGlyphSize} color={Colors.primary} />
    </ArtTile>
    <TileCaption color={Colors.primary} numberOfLines={1}>
      {label}
    </TileCaption>
  </TouchableOpacity>
);

export default AddTileCard;
