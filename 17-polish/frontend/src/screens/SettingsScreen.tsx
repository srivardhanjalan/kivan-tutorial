import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth, useUser } from '@clerk/clerk-expo';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import SectionHeader from '../components/SectionHeader';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import ConfirmCancelButtons from '../components/ConfirmCancelButtons';
import ModalCard from '../components/ModalCard';
import OnboardingTutorial from '../components/OnboardingTutorial';
import ImageUploadField from '../components/ImageUploadField';
import CoverPickerField from '../components/CoverPickerField';
import SettingItemList from '../components/SettingItemList';
import useFetch from '../hooks/useFetch';
import useAsyncAction from '../hooks/useAsyncAction';
import { usePendingImageUpload } from '../hooks/usePendingImageUpload';
import { useCoverPicker } from '../hooks/useCoverPicker';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { deleteAccount, fetchCurrentUser, updateProfile } from '../services/api';
import type { ProfileUpdate } from '../services/api';
import { coverValueToPersist } from '../constants/DefaultCoverPhotos';
import { isAdmin } from '../utils/adminAccess';
import { clerkFullName, clerkPrimaryEmail } from '../utils/clerkName';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => String(THIS_YEAR - i));

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

/**
 * Settings: edit the profile (name to Clerk AND the backend record, so
 * neither goes stale; birthday to the backend), replay the tutorial, and
 * the danger zone — sign out, or delete the account for good.
 */
export default function SettingsScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const navigation = useAppNavigation();
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
  // The cover preset picker layered over the upload slot: a chosen gradient
  // preset (stored as `preset:<id>` in cover_photo) or the custom upload, last
  // one wins. Seeds null; the saved cover_photo goes into the upload slot below.
  const coverPicker = useCoverPicker(coverPhoto);

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

  // Claim whichever photos changed — the hook knows whether an upload
  // replaced what it was seeded with. A no-op if nothing changed.
  const savePhotos = () =>
    run(async () => {
      const update: ProfileUpdate = {};
      if (profilePhoto.changedUrl) {
        update.image_url = profilePhoto.changedUrl;
      }
      // A picked preset wins; else persist a new custom upload if there was one
      const cover = coverValueToPersist(coverPicker.chosenPreset, coverPhoto.changedUrl);
      if (cover) {
        update.cover_photo = cover;
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
    <FloatingHeaderLayout title="Settings" loading={loading} showBack>
      <SectionHeader title="Account" />

      {editingName ? (
        <View style={styles.editBlock}>
          <FormInput value={firstName} placeholder="First name" onChangeText={setFirstName} />
          <FormInput value={lastName} placeholder="Last name" onChangeText={setLastName} />
          <ConfirmCancelButtons
            confirmTitle="Save Name"
            onConfirm={saveName}
            loading={saving}
            onCancel={() => setEditingName(false)}
          />
        </View>
      ) : editingBirthday ? (
        <View style={styles.editBlock}>
          <View style={styles.pickers}>
            <WheelColumn values={DAYS} selected={day} onChange={setDay} padLabels />
            <WheelColumn values={MONTHS} selected={month} onChange={setMonth} padLabels />
            <WheelColumn values={YEARS} selected={year} onChange={setYear} />
          </View>
          <ConfirmCancelButtons
            confirmTitle="Save Birthday"
            onConfirm={saveBirthday}
            loading={saving}
            onCancel={() => setEditingBirthday(false)}
          />
        </View>
      ) : (
        <SettingItemList
          items={[
            {
              id: 'name',
              label: 'Name',
              rightContent: <Text style={styles.value}>{clerkFullName(user) || 'Add'}</Text>,
              onPress: startNameEdit,
            },
            {
              id: 'email',
              label: 'Email',
              rightContent: <Text style={styles.value}>{clerkPrimaryEmail(user)}</Text>,
            },
            {
              id: 'birthday',
              label: 'Birthday',
              rightContent: <Text style={styles.value}>{birthday ?? 'Add'}</Text>,
              onPress: () => setEditingBirthday(true),
            },
          ]}
        />
      )}

      <SectionHeader title="Photos" />
      <View style={styles.editBlock}>
        {/* The cover field (labeled preview + preset picker + custom upload),
            then the profile photo the tutorial already shipped. */}
        <CoverPickerField picker={coverPicker} label="Cover photo" />
        <View style={styles.profilePhoto}>
          <ImageUploadField label="Profile photo" upload={profilePhoto} />
        </View>
        <PrimaryButton title="Save Photos" onPress={savePhotos} loading={saving} />
      </View>

      <SectionHeader title="Notifications" />
      <SettingItemList
        items={[
          {
            id: 'notif',
            label: 'Notification settings',
            onPress: () => navigation.navigate('NotificationSettings'),
          },
        ]}
      />

      <SectionHeader title="Help" />
      <SettingItemList
        items={[{ id: 'tutorial', label: 'Replay the tutorial', onPress: () => setShowTutorial(true) }]}
      />

      {/* The only entry to the admin dashboard, shown to admins alone: a
          non-admin never sees this row (the backend gates every write too). */}
      {isAdmin(backendUser) && (
        <>
          <SectionHeader title="Admin" />
          <SettingItemList
            items={[
              { id: 'admin', label: 'Admin dashboard', onPress: () => navigation.navigate('AdminHome') },
            ]}
          />
        </>
      )}

      <SectionHeader title="Danger zone" />
      <SettingItemList
        items={[
          {
            id: 'delete',
            label: 'Delete account',
            destructive: true,
            onPress: () => setShowDeleteModal(true),
          },
        ]}
      />

      <View style={styles.signOut}>
        <PrimaryButton title="Sign Out" variant="secondary" onPress={() => signOut()} />
      </View>

      <OnboardingTutorial visible={showTutorial} onDismiss={() => setShowTutorial(false)} />

      <ModalCard
        visible={showDeleteModal}
        title="Delete your account?"
        message="Your profile is removed and your sign-in stops working everywhere. This cannot be undone. Type DELETE to confirm."
      >
        <FormInput
          value={deleteConfirmation}
          placeholder="DELETE"
          autoCapitalize="characters"
          autoCorrect={false}
          onChangeText={setDeleteConfirmation}
        />
        <ConfirmCancelButtons
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
      </ModalCard>
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  value: {
    ...Typography.bodySecondary,
  },
  profilePhoto: {
    marginTop: Spacing.xxl,
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
  signOut: {
    marginTop: Spacing.xxxl,
  },
});
