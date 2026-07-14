import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';

export interface EmptyStateViewProps {
  /**
   * Icon name from Ionicons (defaults to 'alert-circle' when error is set)
   */
  icon?: keyof typeof Ionicons.glyphMap;

  /**
   * Icon size (default: 48)
   */
  iconSize?: number;

  /**
   * Main title text
   */
  title: string;

  /**
   * Optional subtitle text
   */
  subtitle?: string;

  /**
   * Optional callback when icon is pressed (makes icon interactive)
   */
  onIconPress?: () => void;

  /**
   * Whether the icon should have interactive styling (default: false)
   */
  isInteractive?: boolean;

  /**
   * Custom icon color (default: Colors.grey, or Colors.danger when error)
   */
  iconColor?: string;

  /**
   * Custom container style
   */
  containerStyle?: any;

  /**
   * Error variant — shows an alert-circle icon with danger tinting.
   * Pair with a "Couldn't load ..." title and onRetry.
   */
  error?: boolean;

  /**
   * Shows a Retry button that invokes this callback (intended for error states)
   */
  onRetry?: () => void;

  /**
   * Label for the retry button (default: 'Retry')
   */
  retryLabel?: string;
}

const EmptyStateView: React.FC<EmptyStateViewProps> = ({
  icon,
  iconSize = 48,
  title,
  subtitle,
  onIconPress,
  isInteractive = false,
  iconColor,
  containerStyle,
  error = false,
  onRetry,
  retryLabel = 'Retry',
}) => {
  const resolvedIcon = icon ?? (error ? 'alert-circle' : 'help-circle-outline');
  const resolvedIconColor =
    iconColor ?? (error ? Colors.danger : Colors.grey);

  const iconElement = (
    <View
      style={[
        styles.iconCircle,
        isInteractive && styles.iconCircleInteractive,
        error && styles.iconCircleError,
      ]}
    >
      <Ionicons
        name={resolvedIcon}
        size={iconSize}
        color={isInteractive ? Colors.primary : resolvedIconColor}
      />
    </View>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {isInteractive && onIconPress ? (
        <TouchableOpacity
          onPress={onIconPress}
          activeOpacity={0.7}
        >
          {iconElement}
        </TouchableOpacity>
      ) : (
        iconElement
      )}

      <Text style={styles.title}>{title}</Text>

      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}

      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color={Colors.textPrimary} />
          <Text style={styles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.lightGrey,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconCircleInteractive: {
    backgroundColor: Colors.primary + '10',
  },
  iconCircleError: {
    backgroundColor: Colors.danger + '10',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.grey,
    textAlign: 'center',
    lineHeight: 21,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    gap: 8,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});

export default React.memo(EmptyStateView);
