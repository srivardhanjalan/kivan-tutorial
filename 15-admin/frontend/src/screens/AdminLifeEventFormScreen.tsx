import React from 'react';
import { useAppRoute } from '../hooks/useAppNavigation';
import AdminEntityForm, { AdminField } from '../components/layouts/AdminEntityForm';
import { createLifeEvent, updateLifeEvent, deleteLifeEvent } from '../services/api';

/**
 * One form for creating and editing a life event. On create the id is the slug
 * the frontend selector matches on (a collision is a 409); on edit it is fixed.
 * Deleting an occasion still in use by a wishlist or event is refused by the
 * backend with a 409, whose reason surfaces on the toast.
 */
export default function AdminLifeEventFormScreen() {
  const lifeEvent = useAppRoute<'AdminLifeEventForm'>().params?.lifeEvent;
  const editing = !!lifeEvent;

  const fields: AdminField[] = [
    { key: 'id', label: 'ID (slug)', placeholder: 'e.g. graduation', initial: lifeEvent?.id ?? '', slugOnCreate: true, required: 'Give the life event an id', autoCapitalize: 'none', maxLength: 100 },
    { key: 'name', label: 'Name', placeholder: 'Occasion name', initial: lifeEvent?.name ?? '', required: 'Give the life event a name', maxLength: 200 },
    { key: 'icon', label: 'Icon (emoji)', placeholder: '🎓', initial: lifeEvent?.icon ?? '', maxLength: 100 },
    { key: 'description', label: 'Description', placeholder: 'Optional', initial: lifeEvent?.description ?? '', maxLength: 2048 },
    { key: 'displayOrder', label: 'Display order', placeholder: '0', initial: String(lifeEvent?.display_order ?? 0), keyboardType: 'number-pad' },
  ];

  return (
    <AdminEntityForm
      noun="Life Event"
      editing={editing}
      fields={fields}
      submitError="Could not save this life event"
      onSubmit={async (values) => {
        const body = {
          name: values.name.trim(),
          description: values.description,
          icon: values.icon,
          display_order: Number(values.displayOrder) || 0,
        };
        if (editing) {
          await updateLifeEvent(lifeEvent!.id, body);
        } else {
          await createLifeEvent({ id: values.id.trim(), ...body });
        }
      }}
      onDelete={() => deleteLifeEvent(lifeEvent!.id)}
      deleteError="Could not delete this life event"
      deleteMessage="It is removed from the taxonomy. This cannot be undone."
    />
  );
}
