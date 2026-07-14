import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Typography from '../constants/Typography';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';

interface SectionHeaderProps {
  title: string;
  /** Muted qualifier rendered inline after the title ("Wishlists 3") */
  meta?: string | number;
}

/** Section title row — one look for every in-screen section. */
const SectionHeader: React.FC<SectionHeaderProps> = ({ title, meta }) => (
  <View style={styles.row}>
    <Text style={styles.title}>
      {title}
      {meta !== undefined && <Text style={styles.meta}>  {meta}</Text>}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.sectionTitle,
    letterSpacing: -0.3,
  },
  meta: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});

export default SectionHeader;
