import React from 'react';
import { useAppRoute } from '../hooks/useAppNavigation';
import AdminEntityForm, { AdminField } from '../components/layouts/AdminEntityForm';
import { createBrand, updateBrand, deleteBrand } from '../services/api';

/**
 * One form for creating and editing a brand — the passed brand (if any) seeds
 * the fields and flips the title and CTA. On create the id is a client-supplied
 * slug (a collision with a seeded brand is a 409, surfaced honestly); on edit
 * the id is fixed. The seed-owned logo is never sent, so a partial edit leaves a
 * seeded logo untouched. Delete lives on the edit form, behind a confirm.
 */
export default function AdminBrandFormScreen() {
  const brand = useAppRoute<'AdminBrandForm'>().params?.brand;
  const editing = !!brand;

  const fields: AdminField[] = [
    { key: 'id', label: 'ID (slug)', placeholder: 'e.g. nike', initial: brand?.id ?? '', slugOnCreate: true, required: 'Give the brand an id', autoCapitalize: 'none', maxLength: 100 },
    { key: 'name', label: 'Name', placeholder: 'Brand name', initial: brand?.name ?? '', required: 'Give the brand a name', maxLength: 200 },
    { key: 'description', label: 'Description', placeholder: 'Optional', initial: brand?.description ?? '', maxLength: 2048 },
    { key: 'websiteUrl', label: 'Website URL', placeholder: 'https://…', initial: brand?.website_url ?? '', autoCapitalize: 'none', maxLength: 2048 },
    { key: 'category', label: 'Category', placeholder: 'e.g. Fashion', initial: brand?.category ?? '', maxLength: 100 },
    { key: 'country', label: 'Country', placeholder: 'e.g. India', initial: brand?.country ?? '', maxLength: 100 },
    { key: 'displayOrder', label: 'Display order', placeholder: '0', initial: String(brand?.display_order ?? 0), keyboardType: 'number-pad' },
  ];

  return (
    <AdminEntityForm
      noun="Brand"
      editing={editing}
      fields={fields}
      submitError="Could not save this brand"
      onSubmit={async (values) => {
        const body = {
          name: values.name.trim(),
          description: values.description,
          website_url: values.websiteUrl.trim(),
          category: values.category.trim(),
          country: values.country.trim(),
          display_order: Number(values.displayOrder) || 0,
        };
        if (editing) {
          await updateBrand(brand!.id, body);
        } else {
          await createBrand({ id: values.id.trim(), ...body });
        }
      }}
      onDelete={() => deleteBrand(brand!.id)}
      deleteError="Could not delete this brand"
      deleteMessage="It is removed from the directory. This cannot be undone."
    />
  );
}
