import React, { useState } from 'react';
import { Platform, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import FieldLabel from './FieldLabel';
import formatEventDate from '../utils/formatEventDate';
import Colors from '../constants/Colors';
import Opacity from '../constants/Opacity';
import Typography from '../constants/Typography';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

interface DatePickerFieldProps {
  label: string;
  value: Date | undefined;
  onChange: (date: Date) => void;
  placeholder?: string;
}

/**
 * A labeled date field backed by the native date picker: tap the outlined field
 * to open the platform picker (an inline calendar on iOS, the system dialog on
 * Android) and the chosen day shows formatted. The value is a Date the caller
 * serializes on save; an unset field shows the placeholder.
 */
const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Pick a date',
}) => {
  const [show, setShow] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android's dialog dismisses itself; iOS keeps the inline picker open until
    // the field is tapped again.
    if (Platform.OS !== 'ios') setShow(false);
    if (event.type === 'set' && selected) onChange(selected);
  };

  return (
    <>
      <FieldLabel>{label}</FieldLabel>
      <TouchableOpacity
        onPress={() => setShow((s) => !s)}
        activeOpacity={Opacity.pressed}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[CommonScreenStyles.outlinedSurface, styles.field]}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatEventDate(value.toISOString()) : placeholder}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: Spacing.lg,
    justifyContent: 'center',
  },
  value: {
    ...Typography.body,
    color: Colors.dark,
  },
  placeholder: {
    ...Typography.body,
    color: Colors.textMuted,
  },
});

export default DatePickerField;
