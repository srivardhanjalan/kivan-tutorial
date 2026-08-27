import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import FieldLabel from './FieldLabel';
import CoverPhoto from './CoverPhoto';
import SettingItemList from './SettingItemList';
import CoverPickerModal from './CoverPickerModal';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';
import type { CoverPicker } from '../hooks/useCoverPicker';

/**
 * A whole cover field: the labeled live preview (a chosen gradient preset or a
 * custom upload) over the two ways to set it — "Choose a cover" and "Upload your
 * own" — plus the preset picker modal, all driven by a {@link useCoverPicker}.
 * The profile cover (Settings) and the wishlist cover (the form) render the
 * identical field; only the `label` differs. The preview seeds its gradient off
 * the current user, whose cover this always is.
 */
export default function CoverPickerField({ picker, label }: { picker: CoverPicker; label: string }) {
  const { user } = useUser();
  return (
    <>
      <FieldLabel>{label}</FieldLabel>
      <CoverPhoto
        ownerId={user?.id ?? ''}
        coverPhoto={picker.effectiveCover}
        height={Spacing.coverBandHeight}
        style={styles.preview}
      />
      <SettingItemList
        items={[
          { id: 'choose-cover', label: 'Choose a cover', onPress: picker.openPicker },
          {
            id: 'upload-cover',
            label: 'Upload your own',
            onPress: picker.uploadCover,
            rightContent: picker.isUploading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : undefined,
          },
        ]}
      />
      <CoverPickerModal
        visible={picker.showCoverPicker}
        currentCover={picker.effectiveCover}
        onSelect={picker.pickPreset}
        onClose={picker.closePicker}
      />
    </>
  );
}

const styles = StyleSheet.create({
  preview: {
    marginBottom: Spacing.md,
  },
});
