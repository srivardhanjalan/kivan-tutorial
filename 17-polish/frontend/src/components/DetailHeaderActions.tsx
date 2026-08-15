import React from 'react';
import { View, StyleSheet } from 'react-native';
import HeaderIconButton from './HeaderIconButton';
import EditDeleteHeaderButtons from './EditDeleteHeaderButtons';

interface DetailHeaderActionsProps {
  /** Fills the share button's screen-reader label ("Share event"). */
  shareLabel: string;
  onShare: () => void;
  /** The edit/delete pair, owner/host-only. Omitted hides it, leaving just share. */
  manage?: {
    subject: string;
    onEdit: () => void;
    onDelete: () => void;
  };
}

/**
 * The right-side header of a detail screen: a share button, plus the edit/delete
 * pair when the viewer owns the thing. Both the event and wishlist detail screens
 * carry this same row, so they share one layout and the share affordance.
 */
const DetailHeaderActions: React.FC<DetailHeaderActionsProps> = ({ shareLabel, onShare, manage }) => (
  <View style={styles.row}>
    <HeaderIconButton icon="share-outline" accessibilityLabel={shareLabel} onPress={onShare} />
    {manage && (
      <EditDeleteHeaderButtons
        subject={manage.subject}
        onEdit={manage.onEdit}
        onDelete={manage.onDelete}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
});

export default DetailHeaderActions;
