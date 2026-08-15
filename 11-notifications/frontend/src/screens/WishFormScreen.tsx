import React, { useState } from 'react';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import FormInput from '../components/FormInput';
import ImageUploadField from '../components/ImageUploadField';
import PrimaryButton from '../components/PrimaryButton';
import { useToast } from '../components/ToastProvider';
import useAsyncAction from '../hooks/useAsyncAction';
import { usePendingImageUpload } from '../hooks/usePendingImageUpload';
import { createWish, updateWish } from '../services/api';
import type { WishCreate, WishUpdate } from '../services/api';
import AppConfig from '../config/app';

/**
 * One form for creating and editing a wish. Cost is typed as plain digits
 * with the currency symbol as its placeholder adornment and parsed to a float
 * on save; a blank or unparseable cost is omitted on create, or sent as null
 * on edit to clear it. Editing seeds every field from the passed wish and
 * routes the save to PUT — where a cleared field sends explicit null so the
 * backend clears it, rather than being omitted and left alone.
 */
export default function WishFormScreen() {
  const navigation = useAppNavigation();
  const route = useAppRoute<'WishForm'>();
  const { wishlistId, wish } = route.params;
  const toast = useToast();
  const { loading: saving, run } = useAsyncAction();

  const [name, setName] = useState(wish?.name ?? '');
  const [description, setDescription] = useState(wish?.description ?? '');
  const [cost, setCost] = useState(wish?.cost != null ? String(wish.cost) : '');
  const [link, setLink] = useState(wish?.link_url ?? '');
  const photo = usePendingImageUpload(
    'wish_photo',
    'Could not upload your wish image',
    wish?.image_url ?? null
  );

  const save = () => {
    if (!name.trim()) {
      toast.show('Give your wish a name', { type: 'error' });
      return;
    }
    const parsed = parseFloat(cost);
    const costValue = cost.trim() && !Number.isNaN(parsed) ? parsed : undefined;
    run(async () => {
      if (wish) {
        // Editing: a cleared nullable field sends explicit null so the backend
        // clears it — omitting would leave the stored value in place. name is
        // always sent (validated non-empty); image_url only when the upload
        // changed it (image_url:null isn't a step-07 flow).
        const body: WishUpdate = {
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          cost: costValue ?? null,
          link_url: link.trim() ? link.trim() : null,
          ...(photo.changedUrl ? { image_url: photo.changedUrl } : {}),
        };
        await updateWish(wish.id, body);
      } else {
        // Creating: omit the empties — there's nothing to clear yet.
        const body: WishCreate = {
          wishlist_id: wishlistId,
          name: name.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(costValue !== undefined ? { cost: costValue } : {}),
          ...(link.trim() ? { link_url: link.trim() } : {}),
          ...(photo.changedUrl ? { image_url: photo.changedUrl } : {}),
        };
        await createWish(body);
      }
      navigation.goBack();
    }, 'Could not save your wish');
  };

  return (
    <FloatingHeaderLayout
      title={wish ? 'Edit Wish' : 'New Wish'}
      showBack
    >
      {/* maxLength mirrors the backend caps so an overlong paste truncates
          here instead of bouncing off validation with a generic toast */}
      <FormInput value={name} placeholder="Wish name" onChangeText={setName} maxLength={200} />
      <FormInput
        value={description}
        placeholder="Description"
        onChangeText={setDescription}
        multiline
        maxLength={2000}
      />
      <FormInput
        value={cost}
        placeholder={`Cost (${AppConfig.currencySymbol})`}
        onChangeText={setCost}
        keyboardType="numeric"
      />
      <FormInput
        value={link}
        placeholder="Link (https://...)"
        onChangeText={setLink}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        maxLength={2048}
      />

      <ImageUploadField label="Wish image" upload={photo} />

      <PrimaryButton title={wish ? 'Save Changes' : 'Add Wish'} onPress={save} loading={saving} />
    </FloatingHeaderLayout>
  );
}
