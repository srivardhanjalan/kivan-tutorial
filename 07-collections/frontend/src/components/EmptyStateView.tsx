import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from './PrimaryButton';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

interface EmptyStateViewProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  /** Optional CTA. Pass both to render a full-width button below the copy —
      the empty state's own call to action (e.g. "Create a wishlist"). */
  actionLabel?: string;
  onAction?: () => void;
}

/** The standard empty state: soft icon disc, title, subtitle, and an optional
    full-width CTA button when actionLabel and onAction are both provided. */
const EmptyStateView: React.FC<EmptyStateViewProps> = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => (
  <View style={styles.container}>
    <View style={[CommonScreenStyles.center, styles.iconCircle]}>
      <Ionicons name={icon} size={48} color={Colors.grey} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    {actionLabel && onAction && (
      <View style={styles.action}>
        <PrimaryButton title={actionLabel} onPress={onAction} />
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: Spacing.xxl,
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.subtleFill,
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
  },
  action: {
    // Cancel the container's horizontal padding so the CTA spans the screen's
    // content width (as the standalone button did), not the narrower text
    // column the centered copy sits in.
    alignSelf: 'stretch',
    marginHorizontal: -Spacing.xxl,
    marginTop: Spacing.xxl,
  },
});

export default EmptyStateView;
