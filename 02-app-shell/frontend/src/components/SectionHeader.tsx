import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

interface SectionHeaderProps {
  /** Section title text */
  title: string;
  /** Muted qualifier rendered inline after the title ("Wishlists 3", "Web Stores US") */
  meta?: string | number;
  /** Optional subtitle below the title */
  subtitle?: string;
  /**
   * Visual size (default: 'large')
   * - large: prominent section title (20/700 dark)
   * - small: settings-style group label (13/700 grey uppercase-ish)
   */
  size?: 'large' | 'small';
  /** When set, renders a right-aligned circular action button on the header row */
  onAction?: () => void;
  /** Icon for the action button (default: 'add') */
  actionIcon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}

/**
 * Standard section heading used above content groups on screens.
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  meta,
  subtitle,
  size = 'large',
  onAction,
  actionIcon = 'add',
  style,
  titleStyle,
}) => {
  const titleBlock = (
    <View style={onAction ? styles.titleBlock : undefined}>
      <Text style={[size === 'large' ? styles.titleLarge : styles.titleSmall, titleStyle]}>
        {title}
        {meta !== undefined ? <Text style={styles.meta}>  {meta}</Text> : null}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );

  return (
    <View
      style={[
        size === 'large' ? styles.containerLarge : styles.containerSmall,
        onAction ? styles.rowWithAction : undefined,
        style,
      ]}
    >
      {titleBlock}
      {onAction ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${title} action`}
        >
          <Ionicons name={actionIcon} size={18} color={Colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  containerLarge: {
    marginBottom: Spacing.lg,
  },
  containerSmall: {
    marginBottom: Spacing.md,
  },
  rowWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  titleLarge: {
    ...Typography.sectionTitle,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: Colors.dark,
  },
  meta: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    letterSpacing: 0,
  },
  titleSmall: {
    ...Typography.sectionLabel,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.grey,
    marginTop: Spacing.xs,
  },
});

export default SectionHeader;
