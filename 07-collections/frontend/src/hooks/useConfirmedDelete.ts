import { useState } from 'react';
import { useAppNavigation } from './useAppNavigation';
import useAsyncAction from './useAsyncAction';

/**
 * The confirm-then-delete dance both detail screens run: a visible flag for the
 * "are you sure?" modal, the delete wrapped in useAsyncAction's loading + toast,
 * and the "on success, pop back to where we came from" that every delete wants.
 *
 * `requestDelete` opens the confirm (wire it to the header's delete button);
 * `confirmProps` spreads straight into <ConfirmModal> — it carries only the
 * mechanical wiring (visible/loading/onConfirm/onCancel), so the per-screen copy
 * (title/message/confirmTitle) stays on the screen, where it reads differently
 * for a wishlist vs. a wish.
 *
 * @param deleteAction the API call that removes the record
 * @param errorFallback the toast shown if it fails (useAsyncAction's signature)
 */
export default function useConfirmedDelete(
  deleteAction: () => Promise<void>,
  errorFallback: string
) {
  const navigation = useAppNavigation();
  const { loading, run } = useAsyncAction();
  const [confirming, setConfirming] = useState(false);

  const requestDelete = () => setConfirming(true);

  const confirmProps = {
    visible: confirming,
    loading,
    onConfirm: () =>
      run(async () => {
        await deleteAction();
        navigation.goBack();
      }, errorFallback),
    onCancel: () => setConfirming(false),
  };

  return { requestDelete, confirmProps };
}
