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
import { createLifeEvent, updateLifeEvent, deleteLifeEvent } from '../services/api';
import type { LifeEventCreate, LifeEventUpdate } from '../services/api';
import { Spacing } from '../constants/ScreenStyles';

/**
 * One form for creating and editing a life event. On create the id is the slug
 * the frontend selector matches on (a collision is a 409); on edit it is fixed.
 * Deleting an occasion still in use by a wishlist or event is refused by the
 * backend with a 409, whose reason surfaces on the toast.
 */
export default function AdminLifeEventFormScreen() {
  const navigation = useAppNavigation();
  const lifeEvent = useAppRoute<'AdminLifeEventForm'>().params?.lifeEvent;
  const editing = !!lifeEvent;
  const toast = useToast();
  const { loading: saving, run } = useAsyncAction();

  const [id, setId] = useState(lifeEvent?.id ?? '');
  const [name, setName] = useState(lifeEvent?.name ?? '');
  const [description, setDescription] = useState(lifeEvent?.description ?? '');
  const [icon, setIcon] = useState(lifeEvent?.icon ?? '');
  const [displayOrder, setDisplayOrder] = useState(String(lifeEvent?.display_order ?? 0));

  const { requestDelete, confirmProps } = useConfirmedDelete(
    () => deleteLifeEvent(lifeEvent!.id),
    'Could not delete this life event'
  );

  const save = () => {
    if (!editing && !id.trim()) {
      toast.show('Give the life event an id', { type: 'error' });
      return;
    }
    if (!name.trim()) {
      toast.show('Give the life event a name', { type: 'error' });
      return;
    }
    run(async () => {
      const order = Number(displayOrder) || 0;
      if (editing) {
        const body: LifeEventUpdate = {
          name: name.trim(),
          description,
          icon,
          display_order: order,
        };
        await updateLifeEvent(lifeEvent!.id, body);
      } else {
        const body: LifeEventCreate = {
          id: id.trim(),
          name: name.trim(),
          description,
          icon,
          display_order: order,
        };
        await createLifeEvent(body);
      }
      navigation.goBack();
    }, 'Could not save this life event');
  };

  return (
    <FormScreenScaffold
      editing={editing}
      noun="Life Event"
      submitLabel="Create Life Event"
      onSubmit={save}
      saving={saving}
    >
      {!editing && (
        <>
          <FieldLabel>ID (slug)</FieldLabel>
          <FormInput value={id} placeholder="e.g. graduation" onChangeText={setId} autoCapitalize="none" maxLength={100} />
        </>
      )}

      <FieldLabel>Name</FieldLabel>
      <FormInput value={name} placeholder="Occasion name" onChangeText={setName} maxLength={200} />

      <FieldLabel>Icon (emoji)</FieldLabel>
      <FormInput value={icon} placeholder="🎓" onChangeText={setIcon} maxLength={100} />

      <FieldLabel>Description</FieldLabel>
      <FormInput value={description} placeholder="Optional" onChangeText={setDescription} maxLength={2048} />

      <FieldLabel>Display order</FieldLabel>
      <FormInput value={displayOrder} placeholder="0" onChangeText={setDisplayOrder} keyboardType="number-pad" />

      {editing && (
        <View style={styles.delete}>
          <PrimaryButton title="Delete Life Event" variant="danger" onPress={requestDelete} />
        </View>
      )}

      <ConfirmModal
        {...confirmProps}
        title="Delete this life event?"
        message="It is removed from the taxonomy. This cannot be undone."
        confirmTitle="Delete Life Event"
      />
    </FormScreenScaffold>
  );
}

const styles = StyleSheet.create({
  delete: {
    marginTop: Spacing.xl,
  },
});
