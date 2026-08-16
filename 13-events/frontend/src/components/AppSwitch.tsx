import React from 'react';
import { Switch } from 'react-native';
import Colors from '../constants/Colors';

interface AppSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * The app's one switch: brand track when on, light grey when off, white
 * thumb. The notification settings rows and the event privacy toggle both
 * render it, so the branded look is spelled once.
 */
const AppSwitch: React.FC<AppSwitchProps> = ({ value, onValueChange, disabled }) => (
  <Switch
    value={value}
    onValueChange={onValueChange}
    trackColor={{ false: Colors.lightGrey, true: Colors.primary }}
    thumbColor={Colors.white}
    ios_backgroundColor={Colors.lightGrey}
    disabled={disabled}
  />
);

export default AppSwitch;
