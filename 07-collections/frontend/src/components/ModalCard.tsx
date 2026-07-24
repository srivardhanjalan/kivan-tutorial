import React from 'react';
import { View, Text, Modal, ScrollView, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

interface ModalCardProps {
  visible: boolean;
  title: string;
  message: string;
  /** The card body below the copy — buttons, a typed-confirm field, etc. */
  children: React.ReactNode;
}

/**
 * The app's one modal surface: a dimmed backdrop, a stretched card, a title
 * and a line of copy, then whatever the caller stacks below. Every confirm —
 * the light delete-wishlist/wish prompt and Settings' typed-DELETE ritual —
 * raises it, so they share one look.
 */
const ModalCard: React.FC<ModalCardProps> = ({ visible, title, message, children }) => (
  <Modal visible={visible} animationType="fade" transparent>
    {/* keyboardShouldPersistTaps: a destructive confirm must fire on the
        FIRST tap, not spend it dismissing the keyboard a typed-confirm raised */}
    <ScrollView
      contentContainerStyle={[CommonScreenStyles.center, styles.backdrop]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.copy}>{message}</Text>
        {children}
      </View>
    </ScrollView>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flexGrow: 1,
    backgroundColor: Colors.toastSurface,
    padding: Spacing.xxl,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.xxl,
  },
  title: {
    ...Typography.sectionTitle,
    marginBottom: Spacing.md,
  },
  copy: {
    ...Typography.bodySecondary,
    marginBottom: Spacing.lg,
  },
});

export default ModalCard;
