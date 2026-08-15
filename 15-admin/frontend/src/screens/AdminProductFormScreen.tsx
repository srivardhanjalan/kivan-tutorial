import React from 'react';
import { useAppRoute } from '../hooks/useAppNavigation';
import AdminEntityForm, { AdminField } from '../components/layouts/AdminEntityForm';
import { createProduct, updateProduct, deleteProduct } from '../services/api';

/**
 * One form for creating and editing a product under its store (the store is
 * passed in). On create the id is a client slug (a collision is a 409); on edit
 * it is fixed, and the store is not editable (move a product by deleting and
 * recreating it). The seed-owned photo is never sent, so a partial edit leaves
 * it intact. Delete lives on the edit form, behind a confirm.
 */
export default function AdminProductFormScreen() {
  const { storefront, product } = useAppRoute<'AdminProductForm'>().params;
  const editing = !!product;

  const fields: AdminField[] = [
    { key: 'id', label: 'ID (slug)', placeholder: 'e.g. acme-mug', initial: product?.id ?? '', slugOnCreate: true, required: 'Give the product an id', autoCapitalize: 'none', maxLength: 100 },
    { key: 'name', label: 'Name', placeholder: 'Product name', initial: product?.name ?? '', required: 'Give the product a name', maxLength: 200 },
    { key: 'description', label: 'Description', placeholder: 'Optional', initial: product?.description ?? '', maxLength: 2048 },
    { key: 'price', label: 'Price', placeholder: '0', initial: product ? String(product.price) : '', keyboardType: 'decimal-pad' },
    { key: 'category', label: 'Category', placeholder: 'e.g. Mugs', initial: product?.category ?? '', maxLength: 100 },
    { key: 'linkUrl', label: 'Link URL', placeholder: 'https://…', initial: product?.link_url ?? '', autoCapitalize: 'none', maxLength: 2048 },
    { key: 'displayOrder', label: 'Display order', placeholder: '0', initial: String(product?.display_order ?? 0), keyboardType: 'number-pad' },
  ];

  return (
    <AdminEntityForm
      noun="Product"
      editing={editing}
      fields={fields}
      submitError="Could not save this product"
      onSubmit={async (values) => {
        const body = {
          name: values.name.trim(),
          description: values.description,
          // The backend validates price (a number, ge 0) and 422s a bad one,
          // which surfaces honestly; an empty field parses to 0.
          price: Number(values.price) || 0,
          category: values.category.trim(),
          link_url: values.linkUrl.trim(),
          display_order: Number(values.displayOrder) || 0,
        };
        if (editing) {
          await updateProduct(storefront.id, product!.id, body);
        } else {
          await createProduct(storefront.id, { id: values.id.trim(), ...body });
        }
      }}
      onDelete={() => deleteProduct(storefront.id, product!.id)}
      deleteError="Could not delete this product"
      deleteMessage="It is removed from the store. This cannot be undone."
    />
  );
}
