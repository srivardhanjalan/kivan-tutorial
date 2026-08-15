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
import { createStorefront, updateStorefront, deleteStorefront } from '../services/api';
import type { StorefrontCreate, StorefrontUpdate } from '../services/api';
import { pluralize } from '../utils/pluralize';
import { Spacing } from '../constants/ScreenStyles';

/**
 * One form for creating and editing a storefront. On create the id is a client
 * slug (a collision is a 409); on edit it is fixed. An existing store also shows
 * a bridge to its products and a delete: deleting a store that still has
 * products is refused by the backend with a 409, whose reason surfaces on the
 * toast (clear its products first). The seed-owned logo and the denormalized
 * product_count are never sent.
 */
export default function AdminStorefrontFormScreen() {
  const navigation = useAppNavigation();
  const storefront = useAppRoute<'AdminStorefrontForm'>().params?.storefront;
  const editing = !!storefront;
  const toast = useToast();
  const { loading: saving, run } = useAsyncAction();

  const [id, setId] = useState(storefront?.id ?? '');
  const [name, setName] = useState(storefront?.name ?? '');
  const [description, setDescription] = useState(storefront?.description ?? '');
  const [displayOrder, setDisplayOrder] = useState(String(storefront?.display_order ?? 0));

  const { requestDelete, confirmProps } = useConfirmedDelete(
    () => deleteStorefront(storefront!.id),
    'Could not delete this storefront'
  );

  const save = () => {
    if (!editing && !id.trim()) {
      toast.show('Give the storefront an id', { type: 'error' });
      return;
    }
    if (!name.trim()) {
      toast.show('Give the storefront a name', { type: 'error' });
      return;
    }
    run(async () => {
      const order = Number(displayOrder) || 0;
      if (editing) {
        const body: StorefrontUpdate = {
          name: name.trim(),
          description,
          display_order: order,
        };
        await updateStorefront(storefront!.id, body);
      } else {
        const body: StorefrontCreate = {
          id: id.trim(),
          name: name.trim(),
          description,
          display_order: order,
        };
        await createStorefront(body);
      }
      navigation.goBack();
    }, 'Could not save this storefront');
  };

  return (
    <FormScreenScaffold
      editing={editing}
      noun="Storefront"
      submitLabel="Create Storefront"
      onSubmit={save}
      saving={saving}
    >
      {!editing && (
        <>
          <FieldLabel>ID (slug)</FieldLabel>
          <FormInput value={id} placeholder="e.g. acme-goods" onChangeText={setId} autoCapitalize="none" maxLength={100} />
        </>
      )}

      <FieldLabel>Name</FieldLabel>
      <FormInput value={name} placeholder="Store name" onChangeText={setName} maxLength={200} />

      <FieldLabel>Description</FieldLabel>
      <FormInput value={description} placeholder="Optional" onChangeText={setDescription} maxLength={2048} />

      <FieldLabel>Display order</FieldLabel>
      <FormInput value={displayOrder} placeholder="0" onChangeText={setDisplayOrder} keyboardType="number-pad" />

      {editing && (
        <View style={styles.actions}>
          <PrimaryButton
            title={`Manage products (${pluralize(storefront!.product_count, 'product')})`}
            variant="secondary"
            onPress={() => navigation.navigate('AdminStorefrontProducts', { storefront: storefront! })}
          />
          <View style={styles.gap} />
          <PrimaryButton title="Delete Storefront" variant="danger" onPress={requestDelete} />
        </View>
      )}

      <ConfirmModal
        {...confirmProps}
        title="Delete this storefront?"
        message="It is removed from the catalog. This cannot be undone."
        confirmTitle="Delete Storefront"
      />
    </FormScreenScaffold>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: Spacing.xl,
  },
  gap: {
    height: Spacing.md,
  },
});
