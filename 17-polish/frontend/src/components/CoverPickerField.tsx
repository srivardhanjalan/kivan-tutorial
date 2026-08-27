import React from 'react';
import { ActivityIndicator } from 'react-native';
import SettingItemList from './SettingItemList';
import CoverPickerModal from './CoverPickerModal';
import Colors from '../constants/Colors';
import type { CoverPicker } from '../hooks/useCoverPicker';

/**
 * The shared control surface below a cover preview: the two ways to set a cover
 * — "Choose a cover" (a gradient preset) and "Upload your own" (a custom photo)
 * — plus the preset picker modal, all driven by a {@link useCoverPicker}. The
 * live CoverPhoto preview stays in each screen above this, since its label and
 * placement differ; this is only the picker itself.
 */
export default function CoverPickerField({ picker }: { picker: CoverPicker }) {
  return (
    <>
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
