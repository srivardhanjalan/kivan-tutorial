import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoverPhoto from './CoverPhoto';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import type { Wishlist } from '../services/api';

/** The rail's aggregate selection: every wish the owner has, across lists. */
export const ALL_WISHES = 'all';

const CARD_WIDTH = 116;
const COVER_HEIGHT = 84;

interface WishlistCardRailProps {
  wishlists: Wishlist[];
  /** The selected wishlist id, or {@link ALL_WISHES} for the aggregate. */
  selectedId: string;
  onSelect: (id: string) => void;
  /** The head aggregate card's label: "All Wishes" on Home, "All Items" on a
      profile. */
  aggregateLabel: string;
  /** Seeds the aggregate card's deterministic cover gradient. */
  aggregateOwnerId: string;
  /** When given, an add tile leads the rail (Home; a profile is read-only). */
  onAdd?: () => void;
}

/** One selectable cover card in the rail. */
function RailCard({
  label,
  ownerId,
  coverPhoto,
  glyph,
  selected,
  onPress,
}: {
  label: string;
  ownerId: string;
  coverPhoto?: string | null;
  glyph?: React.ComponentProps<typeof Ionicons>['name'];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <View style={[styles.coverFrame, selected && styles.coverFrameSelected]}>
        <CoverPhoto ownerId={ownerId} coverPhoto={coverPhoto} height={COVER_HEIGHT} borderRadius={BorderRadius.md}>
          {glyph && (
            <View style={[CommonScreenStyles.center, StyleSheet.absoluteFill]}>
              <Ionicons name={glyph} size={28} color={Colors.white} />
            </View>
          )}
        </CoverPhoto>
      </View>
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * A horizontal rail of wishlist cover cards that filters the wishes feed below:
 * an aggregate card (every wish) leads, then an optional add tile, then one
 * cover card per wishlist. Tapping a card selects it; the selected card wears a
 * brand ring. Home and the public profile share it — Home adds the add tile,
 * a profile is read-only.
 */
const WishlistCardRail: React.FC<WishlistCardRailProps> = ({
  wishlists,
  selectedId,
  onSelect,
  aggregateLabel,
  aggregateOwnerId,
  onAdd,
}) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={CommonScreenStyles.horizontalRail}>
    <RailCard
      label={aggregateLabel}
      ownerId={aggregateOwnerId}
      glyph="apps"
      selected={selectedId === ALL_WISHES}
      onPress={() => onSelect(ALL_WISHES)}
    />
    {onAdd && (
      <TouchableOpacity
        style={styles.card}
        onPress={onAdd}
        activeOpacity={Opacity.pressed}
        accessibilityRole="button"
        accessibilityLabel="New wishlist"
      >
        <View style={[CommonScreenStyles.center, styles.addTile]}>
          <Ionicons name="add" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.label} numberOfLines={2}>New</Text>
      </TouchableOpacity>
    )}
    {wishlists.map((wishlist) => (
      <RailCard
        key={wishlist.id}
        label={wishlist.name}
        ownerId={wishlist.created_by}
        coverPhoto={wishlist.image_url}
        selected={selectedId === wishlist.id}
        onPress={() => onSelect(wishlist.id)}
      />
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
  },
  // A 2pt frame that blends with the screen idle so selecting one only swaps
  // the color to the brand — the card never shifts size between states.
  coverFrame: {
    borderRadius: BorderRadius.lg,
    padding: 2,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  coverFrameSelected: {
    borderColor: Colors.primary,
  },
  addTile: {
    height: COVER_HEIGHT,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.subtleFill,
    marginVertical: 2,
    marginHorizontal: 2,
  },
  label: {
    ...Typography.bodySecondary,
    marginTop: Spacing.xs,
  },
  labelSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default WishlistCardRail;
