import { Linking } from 'react-native';
import { useToast } from '../components/ToastProvider';

/**
 * Open an external URL, toasting a friendly reason when the platform can't.
 * The wish detail and the product detail both jump to a source/store link the
 * same way, so the open call and its failure copy live here once and can't
 * drift between the two screens.
 */
export default function useOpenExternalLink() {
  const toast = useToast();
  return (url: string) =>
    Linking.openURL(url).catch(() =>
      toast.show('Could not open the link', { type: 'error' })
    );
}
