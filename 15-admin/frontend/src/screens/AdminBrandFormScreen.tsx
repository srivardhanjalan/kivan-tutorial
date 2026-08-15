import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FormScreenScaffold from '../components/layouts/FormScreenScaffold';
import FormInput from '../components/FormInput';
import FieldLabel from '../components/FieldLabel';
import PrimaryButton from '../components/PrimaryButton';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/ToastProvider';
import useAsyncAction from '../hooks/useAsyncAction';
import useConfirmedDelete from '../hooks/useConfirmedDelete';
import { createBrand, updateBrand, deleteBrand } from '../services/api';
import type { BrandCreate, BrandUpdate } from '../services/api';
import { Spacing } from '../constants/ScreenStyles';

/**
 * One form for creating and editing a brand — the passed brand (if any) seeds
 * the fields and flips the title and CTA. On create the id is a client-supplied
 * slug (a collision with a seeded brand is a 409, surfaced honestly); on edit
 * the id is fixed. The seed-owned logo is never sent, so a partial edit leaves a
 * seeded logo untouched. Delete lives on the edit form, behind a confirm.
 */
export default function AdminBrandFormScreen() {
  const navigation = useAppNavigation();
  const brand = useAppRoute<'AdminBrandForm'>().params?.brand;
  const editing = !!brand;
  const toast = useToast();
  const { loading: saving, run } = useAsyncAction();

  const [id, setId] = useState(brand?.id ?? '');
  const [name, setName] = useState(brand?.name ?? '');
  const [description, setDescription] = useState(brand?.description ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(brand?.website_url ?? '');
  const [category, setCategory] = useState(brand?.category ?? '');
  const [country, setCountry] = useState(brand?.country ?? '');
  const [displayOrder, setDisplayOrder] = useState(String(brand?.display_order ?? 0));

  const { requestDelete, confirmProps } = useConfirmedDelete(
    () => deleteBrand(brand!.id),
    'Could not delete this brand'
  );

  const save = () => {
    if (!editing && !id.trim()) {
      toast.show('Give the brand an id', { type: 'error' });
      return;
    }
    if (!name.trim()) {
      toast.show('Give the brand a name', { type: 'error' });
      return;
    }
    run(async () => {
      const order = Number(displayOrder) || 0;
      if (editing) {
        const body: BrandUpdate = {
          name: name.trim(),
          description,
          website_url: websiteUrl.trim(),
          category: category.trim(),
          country: country.trim(),
          display_order: order,
        };
        await updateBrand(brand!.id, body);
      } else {
        const body: BrandCreate = {
          id: id.trim(),
          name: name.trim(),
          description,
          website_url: websiteUrl.trim(),
          category: category.trim(),
          country: country.trim(),
          display_order: order,
        };
        await createBrand(body);
      }
      navigation.goBack();
    }, 'Could not save this brand');
  };

  return (
    <FormScreenScaffold
      editing={editing}
      noun="Brand"
      submitLabel="Create Brand"
      onSubmit={save}
      saving={saving}
    >
      {!editing && (
        <>
          <FieldLabel>ID (slug)</FieldLabel>
          <FormInput value={id} placeholder="e.g. nike" onChangeText={setId} autoCapitalize="none" maxLength={100} />
        </>
      )}

      <FieldLabel>Name</FieldLabel>
      <FormInput value={name} placeholder="Brand name" onChangeText={setName} maxLength={200} />

      <FieldLabel>Description</FieldLabel>
      <FormInput value={description} placeholder="Optional" onChangeText={setDescription} maxLength={2048} />

      <FieldLabel>Website URL</FieldLabel>
      <FormInput value={websiteUrl} placeholder="https://…" onChangeText={setWebsiteUrl} autoCapitalize="none" maxLength={2048} />

      <FieldLabel>Category</FieldLabel>
      <FormInput value={category} placeholder="e.g. Fashion" onChangeText={setCategory} maxLength={100} />

      <FieldLabel>Country</FieldLabel>
      <FormInput value={country} placeholder="e.g. India" onChangeText={setCountry} maxLength={100} />

      <FieldLabel>Display order</FieldLabel>
      <FormInput value={displayOrder} placeholder="0" onChangeText={setDisplayOrder} keyboardType="number-pad" />

      {editing && (
        <View style={styles.delete}>
          <PrimaryButton title="Delete Brand" variant="danger" onPress={requestDelete} />
        </View>
      )}

      <ConfirmModal
        {...confirmProps}
        title="Delete this brand?"
        message="It is removed from the directory. This cannot be undone."
        confirmTitle="Delete Brand"
      />
    </FormScreenScaffold>
  );
}

const styles = StyleSheet.create({
  delete: {
    marginTop: Spacing.xl,
  },
});
