import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ModalCard from './ModalCard';
import PrimaryButton from './PrimaryButton';
import CoverPhoto from './CoverPhoto';
import { COVER_PRESETS, coverPhotoValue, presetFromCoverPhoto } from '../constants/DefaultCoverPhotos';
import type { CoverPreset } from '../constants/DefaultCoverPhotos';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

interface CoverPickerModalProps {
  visible: boolean;
  /** The cover value in effect, so the matching preset reads as selected. */
  currentCover?: string | null;
  onSelect: (preset: CoverPreset) => void;
  onClose: () => void;
}

/**
 * The cover-photo preset picker: a grid of the default gradients on the shared
 * ModalCard. Tapping one hands it back to the caller (which stages it for the
 * profile save); the one matching the current cover wears a check. The custom
 * upload lives beside this on the settings screen — presets are the alternative,
 * not a replacement.
 */
const CoverPickerModal: React.FC<CoverPickerModalProps> = ({ visible, currentCover, onSelect, onClose }) => {
  const selectedId = presetFromCoverPhoto(currentCover)?.id;
  return (
    <ModalCard visible={visible} title="Choose a cover" message="Pick a gradient for your cover photo.">
      <View style={styles.grid}>
        {COVER_PRESETS.map((preset) => {
          const selected = preset.id === selectedId;
          return (
            <TouchableOpacity
              key={preset.id}
              style={styles.swatch}
              onPress={() => onSelect(preset)}
              activeOpacity={Opacity.pressed}
              accessibilityRole="button"
              accessibilityLabel={preset.name}
            >
              <CoverPhoto
                ownerId="preview"
                coverPhoto={coverPhotoValue(preset)}
                height={64}
                borderRadius={BorderRadius.md}
              >
                {selected && (
                  <View style={[CommonScreenStyles.center, StyleSheet.absoluteFill, styles.selectedWash]}>
                    <Ionicons name="checkmark-circle" size={28} color={Colors.white} />
                  </View>
                )}
              </CoverPhoto>
              <Text style={styles.name} numberOfLines={1}>{preset.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <PrimaryButton title="Done" variant="secondary" onPress={onClose} />
    </ModalCard>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  swatch: {
    width: '48%',
    marginBottom: Spacing.md,
  },
  selectedWash: {
    backgroundColor: Colors.coverScrim,
    borderRadius: BorderRadius.md,
  },
  name: {
    ...Typography.bodySecondary,
    marginTop: Spacing.xs,
  },
});

export default CoverPickerModal;
