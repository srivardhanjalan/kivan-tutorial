import React from 'react';
import FloatingHeaderLayout from './FloatingHeaderLayout';
import PrimaryButton from '../PrimaryButton';

interface FormScreenScaffoldProps {
  /** True when editing an existing entity, flipping the title prefix and CTA */
  editing: boolean;
  /** The entity noun; titles the screen "New <noun>" / "Edit <noun>" */
  noun: string;
  /** CTA label in create mode; edit mode always reads "Save Changes" */
  submitLabel: string;
  onSubmit: () => void;
  saving: boolean;
  children: React.ReactNode;
}

/**
 * The create/edit scaffold shared by the entity editors (event, wishlist,
 * wish): a floating-header screen titled "New <noun>" / "Edit <noun>" with the
 * form's fields as children and a submit CTA pinned below. The CTA reads
 * "Save Changes" when editing, else the create-mode submitLabel. Each screen
 * owns only its own fields and save logic.
 */
export default function FormScreenScaffold({
  editing,
  noun,
  submitLabel,
  onSubmit,
  saving,
  children,
}: FormScreenScaffoldProps) {
  return (
    <FloatingHeaderLayout title={`${editing ? 'Edit' : 'New'} ${noun}`} showBack>
      {children}
      <PrimaryButton
        title={editing ? 'Save Changes' : submitLabel}
        onPress={onSubmit}
        loading={saving}
      />
    </FloatingHeaderLayout>
  );
}
