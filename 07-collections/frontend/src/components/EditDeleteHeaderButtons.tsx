import React from 'react';
import { View, StyleSheet } from 'react-native';
import HeaderIconButton from './HeaderIconButton';

interface EditDeleteHeaderButtonsProps {
  /** Names the thing acted on — fills the labels ("Edit wish" / "Delete wish") */
  subject: string;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * The edit/delete header pair the detail screens share: a pencil and a trash
 * HeaderIconButton side by side. The only thing that varies between screens is
 * the `subject`, so it parameterizes the screen-reader labels — nothing else.
 */
const EditDeleteHeaderButtons: React.FC<EditDeleteHeaderButtonsProps> = ({
  subject,
  onEdit,
  onDelete,
}) => (
  <View style={styles.row}>
    <HeaderIconButton
      icon="pencil-outline"
      accessibilityLabel={`Edit ${subject}`}
      onPress={onEdit}
    />
    <HeaderIconButton
      icon="trash-outline"
      accessibilityLabel={`Delete ${subject}`}
      onPress={onDelete}
    />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
});

export default EditDeleteHeaderButtons;
