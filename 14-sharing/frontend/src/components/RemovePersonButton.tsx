import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Opacity from '../constants/Opacity';

interface RemovePersonButtonProps {
  /** The person's name, which fills the screen-reader label ("Remove Ada"). */
  label: string;
  onPress: () => void;
}

/**
 * The close (x) affordance that trails a person in a list: the guest list's
 * remove-guest and the owner list's remove-co-owner are the same button, so
 * they share one tap target, hit slop, and label idiom.
 */
const RemovePersonButton: React.FC<RemovePersonButtonProps> = ({ label, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={Opacity.pressed}
    accessibilityRole="button"
    accessibilityLabel={`Remove ${label}`}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Ionicons name="close" size={22} color={Colors.textMuted} />
  </TouchableOpacity>
);

export default RemovePersonButton;
