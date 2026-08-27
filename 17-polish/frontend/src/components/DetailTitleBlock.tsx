import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

interface DetailTitleBlockProps {
  title: string;
  description?: string | null;
}

/**
 * The title and blurb a detail screen leads with. The wish detail and the
 * product detail open with the same two lines (the big name, the muted
 * description), so they live here once and can't drift between the screens; each
 * screen renders its own price row below (a glass pill beside the link/CTA).
 */
const DetailTitleBlock: React.FC<DetailTitleBlockProps> = ({ title, description }) => (
  <>
    <Text style={styles.name}>{title}</Text>
    {description ? <Text style={styles.description}>{description}</Text> : null}
  </>
);

const styles = StyleSheet.create({
  name: {
    ...Typography.sectionTitle,
    marginTop: Spacing.lg,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
});

export default DetailTitleBlock;
