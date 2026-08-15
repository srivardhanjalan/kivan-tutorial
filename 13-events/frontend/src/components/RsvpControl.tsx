import React from 'react';
import { View, StyleSheet } from 'react-native';
import SelectablePill from './SelectablePill';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import type { RsvpStatus, RsvpChoice } from '../services/api';

/** The three answers an invitee can give, in the order they read as warm ->
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
 * An invitee's own RSVP: a row of Going / Maybe / Can't go chips rendered as
 * the shared SelectablePill, driving the PATCH the detail screen owns.
 */
const RsvpControl: React.FC<RsvpControlProps> = ({ value, onChange, busy }) => (
  <View style={[styles.row, busy && CommonScreenStyles.dimmed]}>
    {CHOICES.map(({ key, label }) => (
      <SelectablePill
        key={key}
        label={label}
        selected={value === key}
        onPress={() => onChange(key)}
        disabled={busy}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});

export default RsvpControl;
