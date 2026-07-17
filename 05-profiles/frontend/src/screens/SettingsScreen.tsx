import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth, useUser } from '@clerk/clerk-expo';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import SectionHeader from '../components/SectionHeader';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import OnboardingTutorial from '../components/OnboardingTutorial';
import { useToast } from '../components/ToastProvider';
import useFetch from '../hooks/useFetch';
import { deleteAccount, fetchCurrentUser, updateProfile } from '../services/api';
import type { RootStackParamList } from '../components/Navigation';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

// Picker VALUES stay unpadded ("1".."31") while LABELS are padded ("01") —
// a padded value never matches an unpadded item and the wheel shows no
// selection (a real bug in this app's first life).
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const YEARS = Array.from({ length: 100 }, (_, i) => String(2026 - i));

/** One tappable settings row: label left, current value right. */
const SettingsRow: React.FC<{
  label: string;
  value?: string;
  onPress?: () => void;
}> = ({ label, value, onPress }) => (
  <TouchableOpacity
    style={styles.row}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={Opacity.pressed}
    accessibilityRole={onPress ? 'button' : 'text'}
    accessibilityLabel={label}
  >
    <Text style={styles.rowLabel}>{label}</Text>
    {value ? <Text style={styles.rowValue}>{value}</Text> : null}
  </TouchableOpacity>
);

/**
 * Settings: edit the profile (name to Clerk AND the backend record, so
 * neither goes stale; birthday to the backend), replay the tutorial, and
 * the danger zone — sign out, or delete the account for good.
 */
export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const { user } = useUser();
  const { signOut } = useAuth();
  const { data: backendUser, loading } = useFetch(fetchCurrentUser);

  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [editingBirthday, setEditingBirthday] = useState(false);
  const [day, setDay] = useState('1');
  const [month, setMonth] = useState('1');
  const [year, setYear] = useState('2000');
  const [birthday, setBirthday] = useState<string | null>(null);

  const [showTutorial, setShowTutorial] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!backendUser) return;
    setBirthday(backendUser.birthday);
    if (backendUser.birthday) {
      // Backend stores YYYY-MM-DD; strip zero-padding so each part matches
      // the unpadded picker values
      const [y, m, d] = backendUser.birthday.split('-');
      setYear(String(parseInt(y, 10)));
      setMonth(String(parseInt(m, 10)));
      setDay(String(parseInt(d, 10)));
    }
  }, [backendUser]);

  const startNameEdit = () => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setEditingName(true);
  };

  const saveName = async () => {
    setSaving(true);
    try {
      // Both stores, on purpose: Clerk is what greets you; the backend
      // record is what the rest of the product reads
      await user?.update({ firstName, lastName });
      await updateProfile({ first_name: firstName, last_name: lastName });
      setEditingName(false);
    } catch {
      toast.show('Could not save your name', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const saveBirthday = async () => {
    setSaving(true);
    try {
      const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const updated = await updateProfile({ birthday: iso });
      setBirthday(updated.birthday);
      setEditingBirthday(false);
    } catch {
      toast.show('Could not save your birthday', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      await deleteAccount(deleteConfirmation);
      await signOut();
    } catch {
      toast.show('Type DELETE exactly to confirm', { type: 'error' });
      setSaving(false);
    }
  };

  return (
    <FloatingHeaderLayout title="Settings" loading={loading} onBack={() => navigation.goBack()}>
      <SectionHeader title="Account" />

      {editingName ? (
        <View style={styles.editBlock}>
          <FormInput value={firstName} placeholder="First name" onChangeText={setFirstName} />
          <FormInput value={lastName} placeholder="Last name" onChangeText={setLastName} />
          <PrimaryButton title="Save Name" onPress={saveName} loading={saving} />
          <View style={styles.buttonGap} />
          <PrimaryButton title="Cancel" variant="secondary" onPress={() => setEditingName(false)} />
        </View>
      ) : (
        <SettingsRow
          label="Name"
          value={[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Add'}
          onPress={startNameEdit}
        />
      )}

      <SettingsRow label="Email" value={user?.emailAddresses[0]?.emailAddress ?? ''} />

      {editingBirthday ? (
        <View style={styles.editBlock}>
          <View style={styles.pickers}>
            <Picker style={styles.picker} selectedValue={day} onValueChange={setDay}>
              {DAYS.map((d) => (
                <Picker.Item key={d} label={d.padStart(2, '0')} value={d} />
              ))}
            </Picker>
            <Picker style={styles.picker} selectedValue={month} onValueChange={setMonth}>
              {MONTHS.map((m) => (
                <Picker.Item key={m} label={m.padStart(2, '0')} value={m} />
              ))}
            </Picker>
            <Picker style={styles.picker} selectedValue={year} onValueChange={setYear}>
              {YEARS.map((y) => (
                <Picker.Item key={y} label={y} value={y} />
              ))}
            </Picker>
          </View>
          <PrimaryButton title="Save Birthday" onPress={saveBirthday} loading={saving} />
          <View style={styles.buttonGap} />
          <PrimaryButton
            title="Cancel"
            variant="secondary"
            onPress={() => setEditingBirthday(false)}
          />
        </View>
      ) : (
        <SettingsRow
          label="Birthday"
          value={birthday ?? 'Add'}
          onPress={() => setEditingBirthday(true)}
        />
      )}

      <SectionHeader title="Help" />
      <SettingsRow label="Replay the tutorial" onPress={() => setShowTutorial(true)} />

      <SectionHeader title="Danger zone" />
      <SettingsRow label="Delete account" onPress={() => setShowDeleteModal(true)} />

      <View style={styles.signOut}>
        <PrimaryButton title="Sign Out" variant="secondary" onPress={() => signOut()} />
      </View>

      <OnboardingTutorial visible={showTutorial} onDismiss={() => setShowTutorial(false)} />

      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={[CommonScreenStyles.center, styles.modalBackdrop]}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete your account?</Text>
            <Text style={styles.modalCopy}>
              Your profile is removed and your sign-in stops working everywhere. This cannot be
              undone. Type DELETE to confirm.
            </Text>
            <FormInput
              value={deleteConfirmation}
              placeholder="DELETE"
              autoCapitalize="characters"
              autoCorrect={false}
              onChangeText={setDeleteConfirmation}
            />
            <PrimaryButton title="Delete Account" variant="danger" onPress={confirmDelete} loading={saving} />
            <View style={styles.buttonGap} />
            <PrimaryButton
              title="Keep my account"
              variant="secondary"
              onPress={() => {
                setDeleteConfirmation('');
                setShowDeleteModal(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.lightGrey,
  },
  rowLabel: {
    ...Typography.body,
  },
  rowValue: {
    ...Typography.bodySecondary,
  },
  editBlock: {
    paddingVertical: Spacing.lg,
  },
  pickers: {
    flexDirection: 'row',
  },
  picker: {
    flex: 1,
  },
  buttonGap: {
    height: Spacing.md,
  },
  signOut: {
    marginTop: Spacing.xxxl,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.toastSurface,
    padding: Spacing.xxl,
  },
  modalCard: {
    alignSelf: 'stretch',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.xxl,
  },
  modalTitle: {
    ...Typography.sectionTitle,
    marginBottom: Spacing.md,
  },
  modalCopy: {
    ...Typography.bodySecondary,
    marginBottom: Spacing.lg,
  },
});
