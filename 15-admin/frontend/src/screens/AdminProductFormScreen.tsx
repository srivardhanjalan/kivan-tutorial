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
import { createProduct, updateProduct, deleteProduct } from '../services/api';
import type { ProductCreate, ProductUpdate } from '../services/api';
import { Spacing } from '../constants/ScreenStyles';

/**
 * One form for creating and editing a product under its store (the store is
 * passed in). On create the id is a client slug (a collision is a 409); on edit
 * it is fixed, and the store is not editable (move a product by deleting and
 * recreating it). The seed-owned photo is never sent, so a partial edit leaves
 * it intact. Delete lives on the edit form, behind a confirm.
 */
export default function AdminProductFormScreen() {
  const navigation = useAppNavigation();
  const { storefront, product } = useAppRoute<'AdminProductForm'>().params;
  const editing = !!product;
  const toast = useToast();
  const { loading: saving, run } = useAsyncAction();

  const [id, setId] = useState(product?.id ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [linkUrl, setLinkUrl] = useState(product?.link_url ?? '');
  const [displayOrder, setDisplayOrder] = useState(String(product?.display_order ?? 0));

  const { requestDelete, confirmProps } = useConfirmedDelete(
    () => deleteProduct(storefront.id, product!.id),
    'Could not delete this product'
  );

  const save = () => {
    if (!editing && !id.trim()) {
      toast.show('Give the product an id', { type: 'error' });
      return;
    }
    if (!name.trim()) {
      toast.show('Give the product a name', { type: 'error' });
      return;
    }
    run(async () => {
      const order = Number(displayOrder) || 0;
      // The backend validates price (a number, ge 0) and 422s a bad one, which
      // surfaces honestly; an empty field parses to 0.
      const priceValue = Number(price) || 0;
      if (editing) {
        const body: ProductUpdate = {
          name: name.trim(),
          description,
          price: priceValue,
          category: category.trim(),
          link_url: linkUrl.trim(),
          display_order: order,
        };
        await updateProduct(storefront.id, product!.id, body);
      } else {
        const body: ProductCreate = {
          id: id.trim(),
          name: name.trim(),
          description,
          price: priceValue,
          category: category.trim(),
          link_url: linkUrl.trim(),
          display_order: order,
        };
        await createProduct(storefront.id, body);
      }
      navigation.goBack();
    }, 'Could not save this product');
  };

  return (
    <FormScreenScaffold
      editing={editing}
      noun="Product"
      submitLabel="Create Product"
      onSubmit={save}
      saving={saving}
    >
      {!editing && (
        <>
          <FieldLabel>ID (slug)</FieldLabel>
          <FormInput value={id} placeholder="e.g. acme-mug" onChangeText={setId} autoCapitalize="none" maxLength={100} />
        </>
      )}

      <FieldLabel>Name</FieldLabel>
      <FormInput value={name} placeholder="Product name" onChangeText={setName} maxLength={200} />

      <FieldLabel>Description</FieldLabel>
      <FormInput value={description} placeholder="Optional" onChangeText={setDescription} maxLength={2048} />

      <FieldLabel>Price</FieldLabel>
      <FormInput value={price} placeholder="0" onChangeText={setPrice} keyboardType="decimal-pad" />

      <FieldLabel>Category</FieldLabel>
      <FormInput value={category} placeholder="e.g. Mugs" onChangeText={setCategory} maxLength={100} />

      <FieldLabel>Link URL</FieldLabel>
      <FormInput value={linkUrl} placeholder="https://…" onChangeText={setLinkUrl} autoCapitalize="none" maxLength={2048} />

      <FieldLabel>Display order</FieldLabel>
      <FormInput value={displayOrder} placeholder="0" onChangeText={setDisplayOrder} keyboardType="number-pad" />

      {editing && (
        <View style={styles.delete}>
          <PrimaryButton title="Delete Product" variant="danger" onPress={requestDelete} />
        </View>
      )}

      <ConfirmModal
        {...confirmProps}
        title="Delete this product?"
        message="It is removed from the store. This cannot be undone."
        confirmTitle="Delete Product"
      />
    </FormScreenScaffold>
  );
}

const styles = StyleSheet.create({
  delete: {
    marginTop: Spacing.xl,
  },
});
