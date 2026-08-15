import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NOTIFICATION_TYPE_ICON from '../constants/notificationTypeIcons';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import SectionHeader from '../components/SectionHeader';
import { useToast } from '../components/ToastProvider';
import useFetch from '../hooks/useFetch';
import {
  NotificationType,
  fetchNotificationSettings,
  updateNotificationSettings,
} from '../services/api';
import type {
  NotificationSettings,
  NotificationSettingsUpdate,
} from '../services/api';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

/** The mute flag a row toggles: the four optional keys of the update body. */
type MuteKey = keyof NotificationSettingsUpdate;

/** The four toggleable notification types, in feed order. Each row is keyed
    by the TYPE; its mute field is derived as `mute_\${type}`, the same
    derivation the Lambda consumer runs, so the relationship the API layer
    documents is enforced here rather than restated. Icons come from the
    shared per-type record. */
const ROWS: {
  type: NotificationType;
  label: string;
  description: string;
}[] = [
  { type: 'follow', label: 'New followers', description: 'When someone follows you' },
  { type: 'wishlist_created', label: 'Wishlist created', description: 'When someone you follow creates a wishlist' },
  { type: 'wish_added', label: 'Wish added', description: 'When someone you follow adds a wish' },
  { type: 'wishlist_loved', label: 'Wishlist loved', description: 'When someone loves your wishlist' },
];

const muteKeyFor = (type: NotificationType): MuteKey => `mute_${type}` as MuteKey;

/**
 * The mute preferences screen, reached from Settings. Each row is a type of
 * notification with a switch. The switch is INVERTED on purpose: the backend
 * stores a `mute_*` flag, but the row reads as "receive this", so ON means
 * receiving (mute = false) and OFF means muted (mute = true). A toggle saves
 * optimistically and rolls back on failure, the same dance the follow and love
 * buttons run, applied here to the settings object.
 */
export default function NotificationSettingsScreen() {
  const toast = useToast();
  // The app's fetch-into-mutable-state idiom (see WishDetailScreen): useFetch
  // owns the load, the local copy exists so the optimistic toggle can flip it.
  const { data, loading } = useFetch(fetchNotificationSettings);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const handleToggle = (key: MuteKey) => {
    if (!settings || saving) return;
    const nextMuted = !settings[key];
    setSettings({ ...settings, [key]: nextMuted }); // optimistic
    setSaving(true);
    updateNotificationSettings({ [key]: nextMuted })
      .then((updated) => setSettings(updated))
      .catch(() => {
        // The save lost: undo the flip and say so.
        setSettings((prev) => (prev ? { ...prev, [key]: !nextMuted } : prev));
        toast.show('Could not update notification settings', { type: 'error' });
      })
      .finally(() => setSaving(false));
  };

  return (
    <FloatingHeaderLayout title="Notification Settings" showBack loading={loading}>
      <SectionHeader title="Notifications" />

      {ROWS.map((row) => (
        <View key={row.type} style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name={NOTIFICATION_TYPE_ICON[row.type]} size={20} color={Colors.grey} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.description}>{row.description}</Text>
          </View>
          <Switch
            // ON = receiving (not muted): the stored flag is inverted for display
            value={settings ? !settings[muteKeyFor(row.type)] : true}
            onValueChange={() => handleToggle(muteKeyFor(row.type))}
            trackColor={{ false: Colors.lightGrey, true: Colors.primary }}
            thumbColor={Colors.white}
            ios_backgroundColor={Colors.lightGrey}
            disabled={saving || !settings}
          />
        </View>
      ))}

      <View style={styles.info}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.textSecondary} />
        <Text style={styles.infoText}>Muted types will not appear in your notification feed.</Text>
      </View>
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.hairline,
  },
  iconWrap: {
    width: 36,
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  label: {
    ...Typography.bodySecondaryStrong,
  },
  description: {
    ...Typography.bodySecondary,
    marginTop: Spacing.hairlineGap,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xxl,
  },
  infoText: {
    ...Typography.bodySecondary,
    flex: 1,
  },
});
