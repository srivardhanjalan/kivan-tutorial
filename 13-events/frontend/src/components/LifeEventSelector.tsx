import React from 'react';
import { ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import useLifeEvents from '../hooks/useLifeEvents';
import SelectablePill from './SelectablePill';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';

interface LifeEventSelectorProps {
  /** The chosen life-event id, or undefined for none */
  selectedId?: string;
  onSelect: (id: string) => void;
}

/**
 * A single-select row of life-event chips (emoji + name) the user tags a
 * wishlist with: it fetches the taxonomy itself and lays the chips out in a
 * horizontal scroller, each chip the shared SelectablePill.
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
      {(lifeEvents ?? []).map((event) => (
        <SelectablePill
          key={event.id}
          label={event.name}
          emoji={event.icon || undefined}
          selected={event.id === selectedId}
          onPress={() => onSelect(event.id)}
        />
      ))}
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
});

export default LifeEventSelector;
