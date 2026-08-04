import React from 'react';
import { Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import useLifeEvents from '../hooks/useLifeEvents';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { Spacing } from '../constants/ScreenStyles';

interface LifeEventSelectorProps {
  /** The chosen life-event id, or undefined for none */
  selectedId?: string;
  onSelect: (id: string) => void;
}

/**
 * A single-select row of life-event chips (emoji + name) the user tags a
 * wishlist with — it fetches the taxonomy itself and lays the chips out in a
 * horizontal scroller. The selected chip fills with the brand accent.
 */
const LifeEventSelector: React.FC<LifeEventSelectorProps> = ({ selectedId, onSelect }) => {
  const { lifeEvents, loading } = useLifeEvents();

  if (loading) {
    return <ActivityIndicator color={Colors.primary} style={styles.loading} />;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {(lifeEvents ?? []).map((event) => {
        const selected = event.id === selectedId;
        return (
          <TouchableOpacity
            key={event.id}
            onPress={() => onSelect(event.id)}
            activeOpacity={Opacity.pressed}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={event.name}
            style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
          >
            {event.icon && <Text style={styles.emoji}>{event.icon}</Text>}
            <Text style={[styles.label, selected && styles.labelSelected]}>{event.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loading: {
    alignSelf: 'flex-start',
    marginVertical: Spacing.md,
  },
  row: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  chipIdle: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
  },
  emoji: {
    fontSize: Typography.body.fontSize,
  },
  label: {
    ...Typography.bodySecondaryStrong,
  },
  labelSelected: {
    color: Colors.white,
  },
});

export default LifeEventSelector;
