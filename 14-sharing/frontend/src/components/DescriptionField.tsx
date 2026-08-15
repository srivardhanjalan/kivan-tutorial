import React from 'react';
import FormInput from './FormInput';

interface DescriptionFieldProps {
  value: string;
  onChangeText: (text: string) => void;
}

/**
 * The multiline description input shared by the event and wish editors: one
 * spelling of the field so its placeholder and the backend length cap it
 * mirrors (an overlong paste truncates here rather than bouncing off
 * validation) can't drift between the two forms.
 */
export default function DescriptionField({ value, onChangeText }: DescriptionFieldProps) {
  return (
    <FormInput
      value={value}
      placeholder="Description"
      onChangeText={onChangeText}
      multiline
      maxLength={2000}
    />
  );
}
