import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

interface SelectablePillProps {
  label: string;
  /** An optional leading emoji (the life-event icon) */
  emoji?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

/**
 * The one selectable pill chip: outlined at rest, brand-filled when chosen,
 * with the touchable and accessibility wiring spelled once. The life-event
 * selector and the RSVP control are its callers, so a selected chip reads
 * and behaves identically wherever one appears. The pill twin of
 * SelectableRow, which owns the outlined-surface variant.
 */
const SelectablePill: React.FC<SelectablePillProps> = ({ label, emoji, selected, onPress, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={Opacity.pressed}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={label}
    style={[styles.chip, selected ? CommonScreenStyles.outlinedPillSelected : CommonScreenStyles.outlinedPill]}
  >
    {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
    <Text style={[styles.label, selected && CommonScreenStyles.selectedPillLabel]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  emoji: {
    fontSize: Typography.body.fontSize,
  },
  label: {
    ...Typography.bodySecondaryStrong,
  },
});

export default SelectablePill;
