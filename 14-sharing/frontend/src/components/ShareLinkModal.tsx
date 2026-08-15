import React from 'react';
import { View, Text, TouchableOpacity, Share, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import ModalCard from './ModalCard';
import PrimaryButton from './PrimaryButton';
import { useToast } from './ToastProvider';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

interface ShareLinkModalProps {
  visible: boolean;
  onClose: () => void;
  /** Modal header, e.g. "Share Wishlist". */
  title: string;
  /** The body copy under the title: what the recipient will be able to do. */
  message: string;
  /** The deep link to copy and share, e.g. `kivan://wishlist/<id>`. */
  link: string;
  /** Toast shown after a successful copy, e.g. "Wishlist link copied". */
  copiedMessage: string;
  /** The plaintext body for the OS share sheet (embeds the link inline). */
  shareMessage: string;
  /** The title the OS share sheet carries. */
  shareTitle: string;
}

/**
 * The one share surface every entity reuses: it shows the raw `kivan://` deep
 * link, copies it to the clipboard on tap, and hands the composed message to the
 * OS share sheet. Presentational only: each entity's modal (wishlist, profile,
 * event) builds the link and copy and delegates here, so all three look and
 * behave identically. The link opens the app straight to the entity; a device
 * without Kivan installed has no handler for the scheme, so there is no web or
 * store fallback to show.
 */
const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  visible,
  onClose,
  title,
  message,
  link,
  copiedMessage,
  shareMessage,
  shareTitle,
}) => {
  const toast = useToast();

  const copyLink = async () => {
    try {
      await Clipboard.setStringAsync(link);
      toast.show(copiedMessage);
    } catch {
      toast.show('Could not copy the link', { type: 'error' });
    }
  };

  const shareLink = async () => {
    try {
      // url is iOS-only; Android reads the link from the message body.
      await Share.share({ message: shareMessage, title: shareTitle, url: link });
    } catch {
      toast.show('Could not open the share sheet', { type: 'error' });
    }
  };

  return (
    <ModalCard visible={visible} title={title} message={message}>
      <TouchableOpacity
        style={styles.linkBox}
        onPress={copyLink}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Copy link"
      >
        <Ionicons name="link" size={20} color={Colors.primary} />
        <Text style={styles.linkText} numberOfLines={1}>
          {link}
        </Text>
      </TouchableOpacity>

      <PrimaryButton title="Share" onPress={shareLink} />
      <View style={styles.gap} />
      <PrimaryButton title="Copy link" variant="secondary" onPress={copyLink} />
      <View style={styles.gap} />
      <PrimaryButton title="Done" variant="secondary" onPress={onClose} />
    </ModalCard>
  );
};

const styles = StyleSheet.create({
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.subtleFill,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.hairline,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  linkText: {
    ...Typography.bodySecondary,
    flex: 1,
    fontFamily: 'monospace',
    color: Colors.dark,
  },
  gap: {
    height: Spacing.md,
  },
});

export default ShareLinkModal;
