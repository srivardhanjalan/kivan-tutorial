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
import useLifeEvents from '../hooks/useLifeEvents';
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

  const { lifeEventFor } = useLifeEvents();

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
        navigation.goBack();
      } else {
        // Straight into the new wishlist, ready to add wishes; replace so back
        // doesn't return to the now-stale form.
        const created = await createWishlist(payload);
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

      <PrivacySelector value={privacy} onChange={setPrivacy} />

      <ImageUploadField label="Wishlist image" upload={photo} />
    </FormScreenScaffold>
  );
}
