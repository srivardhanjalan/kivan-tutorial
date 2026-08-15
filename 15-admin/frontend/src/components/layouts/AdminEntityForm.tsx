import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import FormScreenScaffold from './FormScreenScaffold';
import FormInput from '../FormInput';
import FieldLabel from '../FieldLabel';
import PrimaryButton from '../PrimaryButton';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../ToastProvider';
import useAsyncAction from '../../hooks/useAsyncAction';
import useConfirmedDelete from '../../hooks/useConfirmedDelete';
import { Spacing } from '../../constants/ScreenStyles';

/** One text field of an admin entity form. The value lives in the controller,
    keyed by `key`; the rest is how the field looks and validates. */
export interface AdminField {
  key: string;
  label: string;
  placeholder: string;
  /** Seed value — the entity's own field when editing, else empty. */
  initial: string;
  /** A client-supplied slug shown only on create; fixed once the entity
      exists, so the field hides when editing. */
  slugOnCreate?: boolean;
  /** When set, an empty (trimmed) value blocks submit with this toast. */
  required?: string;
  autoCapitalize?: 'none';
  keyboardType?: 'number-pad' | 'decimal-pad';
  maxLength?: number;
}

/**
 * The three fields every admin form shares verbatim get a builder each, so the
 * shape (and the boilerplate that must stay in lockstep) lives in one place and
 * each screen names only what differs — the seed value, and for the slug the
 * copy that names the entity.
 */

/** The client-supplied slug id an entity opens with: shown only on create,
    fixed once it exists. Placeholder and the empty-value toast name the entity. */
export function slugField(current: string | undefined, placeholder: string, required: string): AdminField {
  return {
    key: 'id',
    label: 'ID (slug)',
    placeholder,
    initial: current ?? '',
    slugOnCreate: true,
    required,
    autoCapitalize: 'none',
    maxLength: 100,
  };
}

/** The optional free-text description every entity carries. */
export function descriptionField(current: string | undefined): AdminField {
  return {
    key: 'description',
    label: 'Description',
    placeholder: 'Optional',
    initial: current ?? '',
    maxLength: 2048,
  };
}

/** The sort key every directory orders by, a plain number seeded to 0. */
export function displayOrderField(current: number | undefined): AdminField {
  return {
    key: 'displayOrder',
    label: 'Display order',
    placeholder: '0',
    initial: String(current ?? 0),
    keyboardType: 'number-pad',
  };
}

interface AdminEntityFormProps {
  /** Titles the screen and every action's label: "New <noun>" / "Edit <noun>",
      "Create <noun>", "Delete <noun>", "Delete this <noun>?". */
  noun: string;
  editing: boolean;
  fields: AdminField[];
  /** Builds the body and calls the create/update API; the controller has
      already validated and wraps this in the loading + toast + goBack dance. */
  onSubmit: (values: Record<string, string>) => Promise<void>;
  /** Toast shown if onSubmit throws without its own reason. */
  submitError: string;
  /** Removes the entity (edit mode only); a 409 reason surfaces on its toast. */
  onDelete: () => Promise<void>;
  deleteError: string;
  /** The confirm modal's body line — what deleting this entity costs. */
  deleteMessage: string;
  /** Extra edit-mode actions above Delete (the storefront's Manage products). */
  editActions?: React.ReactNode;
}

/**
 * The create/edit controller every admin entity form shares: it owns the field
 * state, the required-field validation, the save dance (loading + toast +
 * goBack), and the delete-behind-a-confirm. Each screen keeps only its field
 * list and the two lines that shape its API body, so the four editors stop
 * being the same 130 lines four times.
 */
export default function AdminEntityForm({
  noun,
  editing,
  fields,
  onSubmit,
  submitError,
  onDelete,
  deleteError,
  deleteMessage,
  editActions,
}: AdminEntityFormProps) {
  const navigation = useAppNavigation();
  const toast = useToast();
  const { loading: saving, run } = useAsyncAction();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.initial]))
  );
  const { requestDelete, confirmProps } = useConfirmedDelete(onDelete, deleteError);

  const setField = (key: string) => (text: string) =>
    setValues((v) => ({ ...v, [key]: text }));

  const save = () => {
    for (const f of fields) {
      if (!f.required || (f.slugOnCreate && editing)) continue;
      if (!values[f.key].trim()) {
        toast.show(f.required, { type: 'error' });
        return;
      }
    }
    run(async () => {
      await onSubmit(values);
      navigation.goBack();
    }, submitError);
  };

  return (
    <FormScreenScaffold
      editing={editing}
      noun={noun}
      submitLabel={`Create ${noun}`}
      onSubmit={save}
      saving={saving}
    >
      {fields.map((f) =>
        f.slugOnCreate && editing ? null : (
          <React.Fragment key={f.key}>
            <FieldLabel>{f.label}</FieldLabel>
            <FormInput
              value={values[f.key]}
              placeholder={f.placeholder}
              onChangeText={setField(f.key)}
              autoCapitalize={f.autoCapitalize}
              keyboardType={f.keyboardType}
              maxLength={f.maxLength}
            />
          </React.Fragment>
        )
      )}

      {editing && (
        <View style={styles.actions}>
          {editActions}
          <PrimaryButton title={`Delete ${noun}`} variant="danger" onPress={requestDelete} />
        </View>
      )}

      <ConfirmModal
        {...confirmProps}
        title={`Delete this ${noun.toLowerCase()}?`}
        message={deleteMessage}
        confirmTitle={`Delete ${noun}`}
      />
    </FormScreenScaffold>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
});
