import React, { useEffect, useState } from 'react';
import AppSwitch from '../components/AppSwitch';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import SectionHeader from '../components/SectionHeader';
import SettingItemList from '../components/SettingItemList';
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

/** A boolean settings field a row toggles: any optional key of the update body
    (the four mute flags plus `email_notifications`). */
type ToggleKey = keyof NotificationSettingsUpdate;

/** The six toggleable notification types, in feed order. Each row is keyed
    by the TYPE; its mute field is derived as `mute_\${type}`, the same
    derivation the Lambda consumer runs, so the relationship the API layer
    documents is enforced here rather than restated. */
const ROWS: {
  type: NotificationType;
  label: string;
  description: string;
}[] = [
  { type: 'follow', label: 'New followers', description: 'When someone follows you' },
  { type: 'wishlist_created', label: 'Wishlist created', description: 'When someone you follow creates a wishlist' },
  { type: 'wish_added', label: 'Wish added', description: 'When someone you follow adds a wish' },
  { type: 'wishlist_loved', label: 'Wishlist loved', description: 'When someone loves your wishlist' },
  { type: 'event_created', label: 'Event created', description: 'When someone you follow creates an event' },
  { type: 'event_invitation', label: 'Event invitations', description: "When you're invited to an event" },
];

const muteKeyFor = (type: NotificationType): ToggleKey => `mute_${type}` as ToggleKey;

/**
 * The notification preferences screen, reached from Settings. The Notifications
 * section is one row per type with a switch that is INVERTED on purpose: the
 * backend stores a `mute_*` flag, but the row reads as "receive this", so ON
 * means receiving (mute = false) and OFF means muted (mute = true). The Email
 * section adds one switch for `email_notifications`, which is NOT inverted: ON
 * means email copies are on. Rows are grouped into raised SettingItemList cards,
 * the same idiom as the main Settings screen. A toggle saves optimistically and
 * rolls back on failure, the same dance the follow and love buttons run.
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

  const handleToggle = (key: ToggleKey) => {
    if (!settings || saving) return;
    const next = !settings[key];
    setSettings({ ...settings, [key]: next }); // optimistic
    setSaving(true);
    updateNotificationSettings({ [key]: next })
      .then((updated) => setSettings(updated))
      .catch(() => {
        // The save lost: undo the flip and say so.
        setSettings((prev) => (prev ? { ...prev, [key]: !next } : prev));
        toast.show('Could not update notification settings', { type: 'error' });
      })
      .finally(() => setSaving(false));
  };

  const notificationItems = ROWS.map((row) => ({
    id: row.type,
    label: row.label,
    description: row.description,
    rightContent: (
      <AppSwitch
        // ON = receiving (not muted): the stored flag is inverted for display
        value={settings ? !settings[muteKeyFor(row.type)] : true}
        onValueChange={() => handleToggle(muteKeyFor(row.type))}
        disabled={saving || !settings}
      />
    ),
  }));

  const emailItems = [
    {
      id: 'email_notifications',
      label: 'Email copies',
      description: 'Get an email when you receive a notification',
      rightContent: (
        <AppSwitch
          // NOT inverted: ON = email copies on (email_notifications = true)
          value={settings ? settings.email_notifications : true}
          onValueChange={() => handleToggle('email_notifications')}
          disabled={saving || !settings}
        />
      ),
    },
  ];

  return (
    <FloatingHeaderLayout title="Notification Settings" showBack loading={loading}>
      <SectionHeader title="Notifications" />
      <SettingItemList items={notificationItems} />

      <View style={styles.info}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.textSecondary} />
        <Text style={styles.infoText}>Muted types will not appear in your notification feed.</Text>
      </View>

      <SectionHeader title="Email" />
      <SettingItemList items={emailItems} />
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  infoText: {
    ...Typography.bodySecondary,
    flex: 1,
  },
});
