import React from 'react';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import type { LifeEvent } from '../services/api';

interface WishlistPlaceholderGlyphProps {
  /** The wishlist's life event, if resolved — its emoji leads when present */
  lifeEvent?: LifeEvent;
  /** Glyph size in pt — the collection tile is smaller than the detail hero */
  size: number;
}

/**
 * The image-less wishlist fallback: the life event's emoji when it has one,
 * else a gift in the brand accent. Both the collection tile and the detail
 * hero raise it — only the glyph size differs.
 */
const WishlistPlaceholderGlyph: React.FC<WishlistPlaceholderGlyphProps> = ({ lifeEvent, size }) =>
  lifeEvent?.icon ? (
    <Text style={{ fontSize: size }}>{lifeEvent.icon}</Text>
  ) : (
    <Ionicons name="gift" size={size} color={Colors.primary} />
  );

export default WishlistPlaceholderGlyph;
