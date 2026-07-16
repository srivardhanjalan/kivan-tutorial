import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import { CommonScreenStyles } from '../constants/ScreenStyles';

interface EmptyStateViewProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

/** The standard empty state: soft icon disc, title, optional subtitle. */
const EmptyStateView: React.FC<EmptyStateViewProps> = ({ icon, title, subtitle }) => (
  <View style={styles.container}>
    <View style={[CommonScreenStyles.center, styles.iconCircle]}>
      <Ionicons name={icon} size={48} color={Colors.grey} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGrey + '55',
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
  },
});

export default EmptyStateView;
