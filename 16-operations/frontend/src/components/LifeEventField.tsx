import React from 'react';
import { View, StyleSheet } from 'react-native';
import FieldLabel from './FieldLabel';
import LifeEventSelector from './LifeEventSelector';
import { Spacing } from '../constants/ScreenStyles';

interface LifeEventFieldProps {
  /** The chosen life-event id, or undefined for none */
  selectedId?: string;
  onSelect: (id: string) => void;
}

/**
 * The labeled life-event picker shared by the event and wishlist editors: the
 * "Life event" heading above the selector, plus the block spacing the
 * marginless selector needs before the next field.
 */
export default function LifeEventField({ selectedId, onSelect }: LifeEventFieldProps) {
  return (
    <>
      <FieldLabel>Life event</FieldLabel>
      <View style={styles.selector}>
        <LifeEventSelector selectedId={selectedId} onSelect={onSelect} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    marginBottom: Spacing.lg,
  },
});
