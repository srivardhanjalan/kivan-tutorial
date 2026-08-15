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

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** A boolean settings field a row toggles: any optional key of the update body
    (the four mute flags plus `email_notifications`). */
type ToggleKey = keyof NotificationSettingsUpdate;

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

const muteKeyFor = (type: NotificationType): ToggleKey => `mute_${type}` as ToggleKey;

/** One settings row: an icon, a label and description, and a switch. `value` is
    already resolved for display (the caller inverts it for a mute row), so this
    component holds only the look, not the mute-vs-email semantics. */
function ToggleRow({
  icon,
  label,
  description,
  value,
  onToggle,
  disabled,
}: {
  icon: IoniconName;
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={Colors.grey} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.lightGrey, true: Colors.primary }}
        thumbColor={Colors.white}
        ios_backgroundColor={Colors.lightGrey}
        disabled={disabled}
      />
    </View>
  );
}

/**
 * The notification preferences screen, reached from Settings. The Notifications
 * section is one row per type with a switch that is INVERTED on purpose: the
 * backend stores a `mute_*` flag, but the row reads as "receive this", so ON
 * means receiving (mute = false) and OFF means muted (mute = true). The Email
 * section adds one switch for `email_notifications`, which is NOT inverted: ON
 * means email copies are on. A toggle saves optimistically and rolls back on
 * failure, the same dance the follow and love buttons run.
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

  return (
    <FloatingHeaderLayout title="Notification Settings" showBack loading={loading}>
      <SectionHeader title="Notifications" />

      {ROWS.map((row) => (
        <ToggleRow
          key={row.type}
          icon={NOTIFICATION_TYPE_ICON[row.type]}
          label={row.label}
          description={row.description}
          // ON = receiving (not muted): the stored flag is inverted for display
          value={settings ? !settings[muteKeyFor(row.type)] : true}
          onToggle={() => handleToggle(muteKeyFor(row.type))}
          disabled={saving || !settings}
        />
      ))}

      <View style={styles.info}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.textSecondary} />
        <Text style={styles.infoText}>Muted types will not appear in your notification feed.</Text>
      </View>

      <SectionHeader title="Email" />

      <ToggleRow
        icon="mail-outline"
        label="Email copies"
        description="Get an email when you receive a notification"
        // NOT inverted: ON = email copies on (email_notifications = true)
        value={settings ? settings.email_notifications : true}
        onToggle={() => handleToggle('email_notifications')}
        disabled={saving || !settings}
      />
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
