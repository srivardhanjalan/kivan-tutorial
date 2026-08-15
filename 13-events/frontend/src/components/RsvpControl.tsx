import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import type { RsvpStatus, RsvpChoice } from '../services/api';

/** The three answers an invitee can give, in the order they read as warm →
    cool. "pending" is never here: it's the server's initial state, shown as no
    chip selected until the invitee picks. */
const CHOICES: { key: RsvpChoice; label: string }[] = [
  { key: 'going', label: 'Going' },
  { key: 'maybe', label: 'Maybe' },
  { key: 'not_going', label: "Can't go" },
];

interface RsvpControlProps {
  /** My current RSVP; null or "pending" leaves every chip unselected. */
  value: RsvpStatus | null;
  onChange: (choice: RsvpChoice) => void;
  /** True while a change is in flight, so the row can't fire twice. */
  busy?: boolean;
}

/**
 * An invitee's own RSVP: a row of Going / Maybe / Can't go chips, the chosen
 * one filled with the brand accent. It borrows the life-event selector's chip
 * look so a selected answer reads the same as a selected life event, and drives
 * the PATCH the detail screen owns.
 */
const RsvpControl: React.FC<RsvpControlProps> = ({ value, onChange, busy }) => (
  <View style={[styles.row, busy && CommonScreenStyles.dimmed]}>
    {CHOICES.map(({ key, label }) => {
      const selected = value === key;
      return (
        <TouchableOpacity
          key={key}
          onPress={() => onChange(key)}
          disabled={busy}
          activeOpacity={Opacity.pressed}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={label}
          style={[styles.chip, selected ? styles.chipSelected : CommonScreenStyles.outlinedPill]}
        >
          <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  label: {
    ...Typography.bodySecondaryStrong,
  },
  labelSelected: {
    color: Colors.white,
  },
});

export default RsvpControl;
