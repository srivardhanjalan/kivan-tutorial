import React from 'react';
import { useAppRoute } from '../hooks/useAppNavigation';
import AdminEntityForm, { AdminField, field } from '../components/layouts/AdminEntityForm';
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
    field.slug(product?.id, 'e.g. acme-mug', 'Give the product an id'),
    field.name(product?.name, 'Product name', 'Give the product a name'),
    field.description(product?.description),
    { key: 'price', label: 'Price', placeholder: '0', initial: product ? String(product.price) : '', keyboardType: 'decimal-pad' },
    field.category(product?.category, 'e.g. Mugs'),
    field.url('linkUrl', 'Link URL', product?.link_url),
    field.displayOrder(product?.display_order),
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
