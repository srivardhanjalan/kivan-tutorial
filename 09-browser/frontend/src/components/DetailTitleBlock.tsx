import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { formatCost } from '../utils/formatCost';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

interface DetailTitleBlockProps {
  title: string;
  /** The item's price/cost in the app currency; null or absent renders no
      price line: a wish may carry no cost, a product always has one */
  cost?: number | null;
  description?: string | null;
}

/**
 * The title, price, and blurb a detail screen leads with. The wish detail and
 * the product detail present a priced item the same way, so the three lines
 * (the big name, the brand-accent price, the muted description) live here once
 * and can't drift between the two screens.
 */
const DetailTitleBlock: React.FC<DetailTitleBlockProps> = ({ title, cost, description }) => (
  <>
    <Text style={styles.name}>{title}</Text>
    {cost != null && <Text style={styles.price}>{formatCost(cost)}</Text>}
    {description ? <Text style={styles.description}>{description}</Text> : null}
  </>
);

const styles = StyleSheet.create({
  name: {
    ...Typography.sectionTitle,
    marginTop: Spacing.lg,
  },
  price: {
    ...Typography.sectionTitle,
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
});

export default DetailTitleBlock;
