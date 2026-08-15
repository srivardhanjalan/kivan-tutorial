import React from 'react';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import AdminEntityForm, { AdminField } from '../components/layouts/AdminEntityForm';
import PrimaryButton from '../components/PrimaryButton';
import { createStorefront, updateStorefront, deleteStorefront } from '../services/api';
import { pluralize } from '../utils/pluralize';

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

  const fields: AdminField[] = [
    { key: 'id', label: 'ID (slug)', placeholder: 'e.g. acme-goods', initial: storefront?.id ?? '', slugOnCreate: true, required: 'Give the storefront an id', autoCapitalize: 'none', maxLength: 100 },
    { key: 'name', label: 'Name', placeholder: 'Store name', initial: storefront?.name ?? '', required: 'Give the storefront a name', maxLength: 200 },
    { key: 'description', label: 'Description', placeholder: 'Optional', initial: storefront?.description ?? '', maxLength: 2048 },
    { key: 'displayOrder', label: 'Display order', placeholder: '0', initial: String(storefront?.display_order ?? 0), keyboardType: 'number-pad' },
  ];

  return (
    <AdminEntityForm
      noun="Storefront"
      editing={editing}
      fields={fields}
      submitError="Could not save this storefront"
      onSubmit={async (values) => {
        const body = {
          name: values.name.trim(),
          description: values.description,
          display_order: Number(values.displayOrder) || 0,
        };
        if (editing) {
          await updateStorefront(storefront!.id, body);
        } else {
          await createStorefront({ id: values.id.trim(), ...body });
        }
      }}
      onDelete={() => deleteStorefront(storefront!.id)}
      deleteError="Could not delete this storefront"
      deleteMessage="It is removed from the catalog. This cannot be undone."
      editActions={
        <PrimaryButton
          title={`Manage products (${pluralize(storefront!.product_count, 'product')})`}
          variant="secondary"
          onPress={() => navigation.navigate('AdminStorefrontProducts', { storefront: storefront! })}
        />
      }
    />
  );
}
