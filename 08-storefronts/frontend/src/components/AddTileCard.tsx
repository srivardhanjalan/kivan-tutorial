import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import ArtTileCard from './ArtTileCard';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';

interface AddTileCardProps {
  /** The caption under the tile, and the button's accessibility label */
  label: string;
  onPress: () => void;
}

/**
 * The add-new tile that leads every collection grid (the shared ArtTileCard
 * with a plus for its placeholder): a soft-filled art block, the plus, and an
 * accent one-line caption, matching the shape and caption position of the cards
 * beside it because it IS one. Serves "New Wishlist" and "New Wish".
 */
const AddTileCard: React.FC<AddTileCardProps> = ({ label, onPress }) => (
  <ArtTileCard
    title={label}
    onPress={onPress}
    color={Colors.subtleFill}
    placeholder={<Ionicons name="add-circle" size={Spacing.tileGlyphSize} color={Colors.primary} />}
    captionColor={Colors.primary}
    captionLines={1}
  />
);

export default AddTileCard;
