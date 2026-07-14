import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Typography from '../constants/Typography';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';

interface SectionHeaderProps {
  title: string;
  /** Muted qualifier rendered inline after the title ("Wishlists 3") */
  meta?: string | number;
}

/** Section title — one look for every in-screen section. */
const SectionHeader: React.FC<SectionHeaderProps> = ({ title, meta }) => (
  <Text style={styles.title}>
    {title}
    {meta !== undefined && <Text style={styles.meta}>  {meta}</Text>}
  </Text>
);

const styles = StyleSheet.create({
  title: {
    ...Typography.sectionTitle,
    letterSpacing: -0.3,
    marginBottom: Spacing.lg,
  },
  meta: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});

export default SectionHeader;
