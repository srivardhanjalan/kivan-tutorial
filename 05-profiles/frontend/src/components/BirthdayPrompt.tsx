import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

/**
 * The one-time nudge to add a birthday. The dismissal persists on the
 * backend record — the original app dropped the flag server-side and
 * re-nagged forever; this step ships the version that remembers.
 */
const BirthdayPrompt: React.FC<{
  onAdd: () => void;
  onDismiss: () => void;
}> = ({ onAdd, onDismiss }) => (
  <View style={[CommonScreenStyles.outlinedSurface, styles.card]}>
    <Ionicons name="gift-outline" size={24} color={Colors.primary} />
    <Text style={styles.copy}>Add your birthday so friends never miss it</Text>
    <TouchableOpacity
      onPress={onAdd}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel="Add birthday"
    >
      <Text style={styles.add}>Add</Text>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={onDismiss}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel="Dismiss birthday prompt"
    >
      <Ionicons name="close" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  copy: {
    ...Typography.bodySecondary,
    flex: 1,
  },
  add: {
    ...Typography.bodySecondaryStrong,
    color: Colors.primary,
  },
});

export default BirthdayPrompt;
