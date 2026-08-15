import React, { useState } from 'react';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FormScreenScaffold from '../components/layouts/FormScreenScaffold';
import FormInput from '../components/FormInput';
import LifeEventField from '../components/LifeEventField';
import ImageUploadField from '../components/ImageUploadField';
import PrivacySelector from '../components/PrivacySelector';
import { useToast } from '../components/ToastProvider';
import useAsyncAction from '../hooks/useAsyncAction';
import { usePendingImageUpload } from '../hooks/usePendingImageUpload';
import { createWishlist, updateWishlist } from '../services/api';
import type { PrivacyType, WishlistCreate } from '../services/api';

/**
 * One form for both creating and editing a wishlist — the passed wishlist (if
 * any) seeds the fields and flips the title and CTA. Name plus an optional
 * life event and cover image; the save routes to POST or PUT accordingly.
 */
export default function WishlistFormScreen() {
  const navigation = useAppNavigation();
  const route = useAppRoute<'WishlistForm'>();
  const wishlist = route.params?.wishlist;
  const toast = useToast();
  const { loading: saving, run } = useAsyncAction();

  const [name, setName] = useState(wishlist?.name ?? '');
  const [lifeEventId, setLifeEventId] = useState<string | undefined>(
    wishlist?.life_event_id ?? undefined
  );
  // A new wishlist defaults public (matching the backend); editing seeds from
  // the current value.
  const [privacy, setPrivacy] = useState<PrivacyType>(wishlist?.privacy_type ?? 'public');
  const photo = usePendingImageUpload(
    'wishlist_photo',
    'Could not upload your wishlist image',
    wishlist?.image_url ?? null
  );

  const save = () => {
    if (!name.trim()) {
      toast.show('Give your wishlist a name', { type: 'error' });
      return;
    }
    run(async () => {
      const payload: WishlistCreate = {
        name: name.trim(),
        privacy_type: privacy,
        ...(lifeEventId ? { life_event_id: lifeEventId } : {}),
        ...(photo.changedUrl ? { image_url: photo.changedUrl } : {}),
      };
      if (wishlist) {
        await updateWishlist(wishlist.id, payload);
      } else {
        await createWishlist(payload);
      }
      navigation.goBack();
    }, 'Could not save your wishlist');
  };

  return (
    <FormScreenScaffold
      editing={!!wishlist}
      noun="Wishlist"
      submitLabel="Create Wishlist"
      onSubmit={save}
      saving={saving}
    >
      {/* maxLength mirrors the backend cap so an overlong paste truncates
          here instead of bouncing off validation with a generic toast */}
      <FormInput value={name} placeholder="Wishlist name" onChangeText={setName} maxLength={200} />

      <LifeEventField selectedId={lifeEventId} onSelect={setLifeEventId} />

      <PrivacySelector value={privacy} onChange={setPrivacy} />

      <ImageUploadField label="Wishlist image" upload={photo} />
    </FormScreenScaffold>
  );
}
