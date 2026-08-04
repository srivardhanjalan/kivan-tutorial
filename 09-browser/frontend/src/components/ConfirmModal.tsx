import React from 'react';
import ModalCard from './ModalCard';
import ConfirmCancelButtons from './ConfirmCancelButtons';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  /** The destructive button's label — e.g. "Delete Wishlist" */
  confirmTitle: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The reusable "are you sure?" for destructive collection actions — deleting
 * a wishlist or a wish both raise it. The shared modal surface, with the
 * danger/secondary button pair. (The account-deletion confirm in Settings
 * builds on the same surface but gates on typed text — a heavier ritual this
 * lighter confirm deliberately omits.)
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmTitle,
  loading,
  onConfirm,
  onCancel,
}) => (
  <ModalCard visible={visible} title={title} message={message}>
    <ConfirmCancelButtons
      confirmTitle={confirmTitle}
      confirmVariant="danger"
      onConfirm={onConfirm}
      loading={loading}
      onCancel={onCancel}
    />
  </ModalCard>
);

export default ConfirmModal;
