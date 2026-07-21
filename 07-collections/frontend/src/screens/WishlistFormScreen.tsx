import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FieldLabel from '../components/FieldLabel';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import FormInput from '../components/FormInput';
import LifeEventSelector from '../components/LifeEventSelector';
import ImageUploadField from '../components/ImageUploadField';
import PrimaryButton from '../components/PrimaryButton';
import { useToast } from '../components/ToastProvider';
import useAsyncAction from '../hooks/useAsyncAction';
import { usePendingImageUpload } from '../hooks/usePendingImageUpload';
import { createWishlist, updateWishlist } from '../services/api';
import type { WishlistCreate } from '../services/api';
import { Spacing } from '../constants/ScreenStyles';

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
    <FloatingHeaderLayout
      title={wishlist ? 'Edit Wishlist' : 'New Wishlist'}
      showBack
    >
      {/* maxLength mirrors the backend cap so an overlong paste truncates
          here instead of bouncing off validation with a generic toast */}
      <FormInput value={name} placeholder="Wishlist name" onChangeText={setName} maxLength={200} />

      <FieldLabel>Life event</FieldLabel>
      {/* The selector isn't a FormInput — it carries no margin of its own, so
          the block spacing to the image field below lives here */}
      <View style={styles.selector}>
        <LifeEventSelector selectedId={lifeEventId} onSelect={setLifeEventId} />
      </View>

      <ImageUploadField label="Wishlist image" upload={photo} />

      <PrimaryButton
        title={wishlist ? 'Save Changes' : 'Create Wishlist'}
        onPress={save}
        loading={saving}
      />
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  selector: {
    marginBottom: Spacing.lg,
  },
});
