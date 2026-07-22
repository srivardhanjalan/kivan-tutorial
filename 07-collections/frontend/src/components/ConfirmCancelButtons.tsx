import React from 'react';
import { View, StyleSheet } from 'react-native';
import PrimaryButton from './PrimaryButton';
import { Spacing } from '../constants/ScreenStyles';

interface ConfirmCancelButtonsProps {
  /** The confirm button's label — e.g. "Save Name", "Delete Wishlist" */
  confirmTitle: string;
  /** primary brand CTA, or danger for a destructive confirm */
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  loading: boolean;
  cancelTitle?: string;
  onCancel: () => void;
}

/**
 * The stacked confirm/cancel pair every edit block and confirm modal ends
 * with: the confirm CTA on top, a hairline gap, then a quiet Cancel. The
 * confirm goes danger-red on destructive actions.
 */
const ConfirmCancelButtons: React.FC<ConfirmCancelButtonsProps> = ({
  confirmTitle,
  confirmVariant = 'primary',
  onConfirm,
  loading,
  cancelTitle = 'Cancel',
  onCancel,
}) => (
  <>
    <PrimaryButton title={confirmTitle} variant={confirmVariant} onPress={onConfirm} loading={loading} />
    <View style={styles.gap} />
    <PrimaryButton title={cancelTitle} variant="secondary" onPress={onCancel} />
  </>
);

const styles = StyleSheet.create({
  gap: {
    height: Spacing.md,
  },
});

export default ConfirmCancelButtons;
