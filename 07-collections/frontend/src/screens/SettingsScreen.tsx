import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth, useUser } from '@clerk/clerk-expo';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import SectionHeader from '../components/SectionHeader';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import OnboardingTutorial from '../components/OnboardingTutorial';
import ImageUploadField from '../components/ImageUploadField';
import useFetch from '../hooks/useFetch';
import useAsyncAction from '../hooks/useAsyncAction';
import { usePendingImageUpload } from '../hooks/usePendingImageUpload';
import { deleteAccount, fetchCurrentUser, updateProfile } from '../services/api';
import type { ProfileUpdate } from '../services/api';
import type { RootStackParamList } from '../components/Navigation';
import { clerkFullName, clerkPrimaryEmail } from '../utils/clerkName';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => String(THIS_YEAR - i));

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
 * One birthday wheel. VALUES stay unpadded ("1") — a padded value never
 * matches an unpadded item and the wheel silently shows no selection (a
 * real bug in this app's first life). Only LABELS get padding.
 */
const WheelColumn: React.FC<{
  values: string[];
  selected: string;
  onChange: (value: string) => void;
  padLabels?: boolean;
}> = ({ values, selected, onChange, padLabels = false }) => (
  <Picker style={styles.picker} selectedValue={selected} onValueChange={onChange}>
    {values.map((v) => (
      <Picker.Item key={v} label={padLabels ? v.padStart(2, '0') : v} value={v} />
    ))}
  </Picker>
);

/** The stacked confirm/cancel pair every edit block ends with. */
const ConfirmCancel: React.FC<{
  confirmTitle: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  loading: boolean;
  cancelTitle?: string;
  onCancel: () => void;
}> = ({ confirmTitle, confirmVariant = 'primary', onConfirm, loading, cancelTitle = 'Cancel', onCancel }) => (
  <>
    <PrimaryButton title={confirmTitle} variant={confirmVariant} onPress={onConfirm} loading={loading} />
    <View style={styles.buttonGap} />
    <PrimaryButton title={cancelTitle} variant="secondary" onPress={onCancel} />
  </>
);

/**
 * Settings: edit the profile (name to Clerk AND the backend record, so
 * neither goes stale; birthday to the backend), replay the tutorial, and
 * the danger zone — sign out, or delete the account for good.
 */
export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useUser();
  const { signOut } = useAuth();
  const { data: backendUser, loading } = useFetch(fetchCurrentUser);
  const { loading: saving, run } = useAsyncAction();

  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [editingBirthday, setEditingBirthday] = useState(false);
  const [day, setDay] = useState('1');
  const [month, setMonth] = useState('1');
  const [year, setYear] = useState('2000');
  const [birthday, setBirthday] = useState<string | null>(null);

  const profilePhoto = usePendingImageUpload('profile_photo', 'Could not upload your profile photo');
  const coverPhoto = usePendingImageUpload('cover_photo', 'Could not upload your cover photo');

  const [showTutorial, setShowTutorial] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    if (!backendUser) return;
    setBirthday(backendUser.birthday);
    if (backendUser.image_url) profilePhoto.setInitialImage(backendUser.image_url);
    if (backendUser.cover_photo) coverPhoto.setInitialImage(backendUser.cover_photo);
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

  const saveName = () =>
    run(async () => {
      // Both stores, on purpose: Clerk is what greets you; the backend
      // record is what the rest of the product reads
      await user?.update({ firstName, lastName });
      await updateProfile({ first_name: firstName, last_name: lastName });
      setEditingName(false);
    }, 'Could not save your name');

  const saveBirthday = () =>
    run(async () => {
      const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const updated = await updateProfile({ birthday: iso });
      setBirthday(updated.birthday);
      setEditingBirthday(false);
    }, 'Could not save your birthday');

  // Claim whichever photos changed: send only the slots whose uploaded URL
  // differs from what the record already holds. A no-op if nothing changed.
  const savePhotos = () =>
    run(async () => {
      const update: ProfileUpdate = {};
      if (profilePhoto.imageUrl && profilePhoto.imageUrl !== backendUser?.image_url) {
        update.image_url = profilePhoto.imageUrl;
      }
      if (coverPhoto.imageUrl && coverPhoto.imageUrl !== backendUser?.cover_photo) {
        update.cover_photo = coverPhoto.imageUrl;
      }
      if (Object.keys(update).length === 0) return;
      await updateProfile(update);
    }, 'Could not save your photos');

  const confirmDelete = () =>
    run(async () => {
      await deleteAccount(deleteConfirmation);
      await signOut();
    }, 'Type DELETE exactly to confirm');

  return (
    <FloatingHeaderLayout title="Settings" loading={loading} onBack={() => navigation.goBack()}>
      <SectionHeader title="Account" />

      {editingName ? (
        <View style={styles.editBlock}>
          <FormInput value={firstName} placeholder="First name" onChangeText={setFirstName} />
          <FormInput value={lastName} placeholder="Last name" onChangeText={setLastName} />
          <ConfirmCancel
            confirmTitle="Save Name"
            onConfirm={saveName}
            loading={saving}
            onCancel={() => setEditingName(false)}
          />
        </View>
      ) : (
        <SettingsRow
          label="Name"
          value={clerkFullName(user) || 'Add'}
          onPress={startNameEdit}
        />
      )}

      <SettingsRow label="Email" value={clerkPrimaryEmail(user)} />

      {editingBirthday ? (
        <View style={styles.editBlock}>
          <View style={styles.pickers}>
            <WheelColumn values={DAYS} selected={day} onChange={setDay} padLabels />
            <WheelColumn values={MONTHS} selected={month} onChange={setMonth} padLabels />
            <WheelColumn values={YEARS} selected={year} onChange={setYear} />
          </View>
          <ConfirmCancel
            confirmTitle="Save Birthday"
            onConfirm={saveBirthday}
            loading={saving}
            onCancel={() => setEditingBirthday(false)}
          />
        </View>
      ) : (
        <SettingsRow
          label="Birthday"
          value={birthday ?? 'Add'}
          onPress={() => setEditingBirthday(true)}
        />
      )}

      <SectionHeader title="Photos" />
      <View style={styles.editBlock}>
        <ImageUploadField
          label="Profile photo"
          imagePreview={profilePhoto.imagePreview}
          isUploading={profilePhoto.isUploading}
          onUpload={profilePhoto.handleUpload}
        />
        <ImageUploadField
          label="Cover photo"
          imagePreview={coverPhoto.imagePreview}
          isUploading={coverPhoto.isUploading}
          onUpload={coverPhoto.handleUpload}
        />
        <PrimaryButton title="Save Photos" onPress={savePhotos} loading={saving} />
      </View>

      <SectionHeader title="Help" />
      <SettingsRow label="Replay the tutorial" onPress={() => setShowTutorial(true)} />

      <SectionHeader title="Danger zone" />
      <SettingsRow label="Delete account" onPress={() => setShowDeleteModal(true)} />

      <View style={styles.signOut}>
        <PrimaryButton title="Sign Out" variant="secondary" onPress={() => signOut()} />
      </View>

      <OnboardingTutorial visible={showTutorial} onDismiss={() => setShowTutorial(false)} />

      <Modal visible={showDeleteModal} animationType="fade" transparent>
        {/* keyboardShouldPersistTaps: a destructive confirm must fire on the
            FIRST tap, not spend it dismissing the keyboard */}
        <ScrollView
          contentContainerStyle={[CommonScreenStyles.center, styles.modalBackdrop]}
          keyboardShouldPersistTaps="handled"
        >
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
            <ConfirmCancel
              confirmTitle="Delete Account"
              confirmVariant="danger"
              onConfirm={confirmDelete}
              loading={saving}
              cancelTitle="Keep my account"
              onCancel={() => {
                setDeleteConfirmation('');
                setShowDeleteModal(false);
              }}
            />
          </View>
        </ScrollView>
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
    borderBottomColor: Colors.hairline,
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
    flexGrow: 1,
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
