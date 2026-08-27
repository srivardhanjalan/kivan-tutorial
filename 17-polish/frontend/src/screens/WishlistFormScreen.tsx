import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FormScreenScaffold from '../components/layouts/FormScreenScaffold';
import FormInput from '../components/FormInput';
import FieldLabel from '../components/FieldLabel';
import LifeEventField from '../components/LifeEventField';
import CoOwnerPickerSection from '../components/CoOwnerPickerSection';
import CoverPhoto from '../components/CoverPhoto';
import CoverPickerModal from '../components/CoverPickerModal';
import SettingItemList from '../components/SettingItemList';
import PrivacySelector from '../components/PrivacySelector';
import { useToast } from '../components/ToastProvider';
import useAsyncAction from '../hooks/useAsyncAction';
import { usePendingImageUpload } from '../hooks/usePendingImageUpload';
import useLifeEvents from '../hooks/useLifeEvents';
import { createWishlist, updateWishlist } from '../services/api';
import {
  coverPhotoValue,
  coverValueToPersist,
  presetFromCoverPhoto,
} from '../constants/DefaultCoverPhotos';
import type { CoverPreset } from '../constants/DefaultCoverPhotos';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';
import type { PrivacyType, User, WishlistCreate } from '../services/api';

/**
 * One form for both creating and editing a wishlist — the passed wishlist (if
 * any) seeds the fields and flips the title and CTA. Name plus an optional life
 * event and cover; the save routes to POST or PUT accordingly.
 *
 * The cover is the wishlist's `image_url`, and it renders as a CoverPhoto band
 * on the detail screen — so the form sets it the same two ways that band
 * resolves: a chosen gradient preset (`preset:<id>`) or a custom upload. The
 * form sends exactly what it renders, preset or upload, so the cover the owner
 * sees while editing is the cover that persists (the create path used to render
 * a band but send nothing).
 */
export default function WishlistFormScreen() {
  const navigation = useAppNavigation();
  const route = useAppRoute<'WishlistForm'>();
  const wishlist = route.params?.wishlist;
  const toast = useToast();
  const { user } = useUser();
  const { loading: saving, run } = useAsyncAction();

  const { lifeEventFor } = useLifeEvents();

  const [name, setName] = useState(wishlist?.name ?? '');
  const [lifeEventId, setLifeEventId] = useState<string | undefined>(
    wishlist?.life_event_id ?? undefined
  );
  // Co-owners seed the new wishlist's owners at create; none = personal. The
  // picker only shows on create — after the wishlist exists, owners are managed
  // from its detail screen.
  const [coOwners, setCoOwners] = useState<User[]>([]);
  // A new wishlist defaults public (matching the backend); editing seeds from
  // the current value.
  const [privacy, setPrivacy] = useState<PrivacyType>(wishlist?.privacy_type ?? 'public');

  // The cover, set two mutually exclusive ways (last one wins, exactly as
  // Settings sets a profile cover): a chosen gradient preset, or a custom
  // upload. Seed the preset from the saved cover when it names one; seed the
  // upload slot only with a saved *image* (a `preset:` string isn't one).
  const seededPreset = presetFromCoverPhoto(wishlist?.image_url);
  const cover = usePendingImageUpload(
    'wishlist_photo',
    'Could not upload your wishlist image',
    seededPreset ? null : wishlist?.image_url ?? null
  );
  const [chosenPreset, setChosenPreset] = useState<string | null>(
    seededPreset ? coverPhotoValue(seededPreset) : null
  );
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  // What the preview band shows: a just-picked preset, else the upload slot
  // (seeded from the saved image, updated on a new upload).
  const effectiveCover = chosenPreset ?? cover.imagePreview;

  const pickPreset = (preset: CoverPreset) => {
    setChosenPreset(coverPhotoValue(preset));
    setShowCoverPicker(false);
  };
  const uploadCover = () => {
    setChosenPreset(null);
    cover.handleUpload();
  };

  const save = () => {
    if (!name.trim()) {
      toast.show('Give your wishlist a name', { type: 'error' });
      return;
    }
    run(async () => {
      // A picked preset wins; else a new upload; else leave the cover untouched.
      const coverValue = coverValueToPersist(chosenPreset, cover.changedUrl);
      const payload: WishlistCreate = {
        name: name.trim(),
        privacy_type: privacy,
        ...(lifeEventId ? { life_event_id: lifeEventId } : {}),
        ...(coverValue ? { image_url: coverValue } : {}),
      };
      if (wishlist) {
        await updateWishlist(wishlist.id, payload);
        navigation.goBack();
      } else {
        // Straight into the new wishlist, ready to add wishes; replace so back
        // doesn't return to the now-stale form.
        const created = await createWishlist({
          ...payload,
          ...(coOwners.length ? { owner_ids: coOwners.map((u) => u.id) } : {}),
        });
        navigation.replace('WishlistDetail', { wishlistId: created.id });
      }
    }, 'Could not save your wishlist');
  };

  // The create CTA leads with the chosen life-event's emoji, echoing the tag
  // you just picked ("🎁  Start Adding Wishes"); editing keeps "Save Changes".
  const eventIcon = lifeEventId ? lifeEventFor(lifeEventId)?.icon : undefined;
  const createLabel = `${eventIcon ? `${eventIcon}  ` : ''}Start Adding Wishes`;

  return (
    <FormScreenScaffold
      editing={!!wishlist}
      noun="Wishlist"
      submitLabel={createLabel}
      onSubmit={save}
      saving={saving}
    >
      {/* maxLength mirrors the backend cap so an overlong paste truncates
          here instead of bouncing off validation with a generic toast */}
      <FormInput value={name} placeholder="Wishlist name" onChangeText={setName} maxLength={200} />

      <LifeEventField selectedId={lifeEventId} onSelect={setLifeEventId} />

      {/* Co-owner seeding is create-only; editing manages owners from the
          detail screen, so the form never re-sends owner_ids on a PUT. */}
      {!wishlist && (
        <CoOwnerPickerSection
          selected={coOwners}
          onAdd={(u) => setCoOwners((prev) => [...prev, u])}
          onRemove={(id) => setCoOwners((prev) => prev.filter((u) => u.id !== id))}
          currentUserId={user?.id ?? ''}
        />
      )}

      <PrivacySelector value={privacy} onChange={setPrivacy} />

      {/* The cover: the same band the detail screen renders, plus the two ways
          to set it (a gradient preset or a custom upload) — so the form sends
          exactly the cover it previews. */}
      <FieldLabel>Cover</FieldLabel>
      <CoverPhoto
        ownerId={user?.id ?? ''}
        coverPhoto={effectiveCover}
        height={140}
        style={styles.coverPreview}
      />
      <SettingItemList
        items={[
          { id: 'choose-cover', label: 'Choose a cover', onPress: () => setShowCoverPicker(true) },
          {
            id: 'upload-cover',
            label: 'Upload your own',
            onPress: uploadCover,
            rightContent: cover.isUploading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : undefined,
          },
        ]}
      />

      <CoverPickerModal
        visible={showCoverPicker}
        currentCover={effectiveCover}
        onSelect={pickPreset}
        onClose={() => setShowCoverPicker(false)}
      />
    </FormScreenScaffold>
  );
}

const styles = StyleSheet.create({
  coverPreview: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
});
