import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Shadows from '../constants/Shadows';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { Spacing } from '../constants/ScreenStyles';

interface SettingItem {
  id: string;
  label: string;
  /** A muted second line under the label. */
  description?: string;
  /** The row's trailing content — a value, a switch. Omit for a bare row. */
  rightContent?: React.ReactNode;
  onPress?: () => void;
  /** A destructive row (Delete account): the label wears the danger color. */
  destructive?: boolean;
}

/**
 * A group of settings rows rendered as one raised card: rows stacked behind a
 * single rounded surface, hairline-divided, the last row flush to the card's
 * foot. Each row is a label (with an optional muted description) on the left
 * and the caller's trailing content on the right, pressable when it carries an
 * onPress. The card-grouped idiom the settings and notification screens share,
 * so their rows can't drift.
 */
const SettingItemList: React.FC<{ items: SettingItem[] }> = ({ items }) => (
  <View style={styles.card}>
    {items.map((item, i) => {
      const rowStyle = [styles.row, i < items.length - 1 && styles.divider];
      const body = (
        <>
          <View style={styles.labelBlock}>
            <Text style={[styles.label, item.destructive && styles.destructive]}>{item.label}</Text>
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          </View>
          {item.rightContent}
        </>
      );
      return item.onPress ? (
        <TouchableOpacity
          key={item.id}
          style={rowStyle}
          onPress={item.onPress}
          activeOpacity={Opacity.pressed}
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          {body}
        </TouchableOpacity>
      ) : (
        <View key={item.id} style={rowStyle} accessibilityLabel={item.label}>
          {body}
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.hairline,
  },
  labelBlock: {
    flex: 1,
    marginRight: Spacing.md,
  },
  label: {
    ...Typography.body,
  },
  destructive: {
    color: Colors.danger,
  },
  description: {
    ...Typography.bodySecondary,
    marginTop: Spacing.hairlineGap,
  },
});

export default SettingItemList;
