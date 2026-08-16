import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppSwitch from './AppSwitch';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';
import type { PrivacyType } from '../services/api';

interface PrivacySelectorProps {
  value: PrivacyType;
  onChange: (value: PrivacyType) => void;
  /** The thing being made public/private; fills the copy. Defaults to wishlist. */
  entityNoun?: string;
  /** Who a private entity stays visible to, e.g. "you and your guests" for an
      event. Defaults to a wishlist's owners and co-owners. */
  privateAudience?: string;
}

/**
 * The privacy control shared by the wishlist and event forms: one switch between
 * the only two visibilities either has. Public shows it to anyone (a profile
 * grid, Discover, a share link); private keeps it to a smaller audience. The
 * icon and copy track the current value so the state reads at a glance, and the
 * noun/audience are parameterized so an event reads as an event, not a wishlist.
 * (There is no third "shared" tier: co-ownership/hosting, not this toggle, is how
 * a private entity reaches more than one person.)
 */
const PrivacySelector: React.FC<PrivacySelectorProps> = ({
  value,
  onChange,
  entityNoun = 'wishlist',
  privateAudience = 'you and any co-owners',
}) => {
  const isPublic = value === 'public';
  return (
    <View style={styles.row}>
      <Ionicons
        name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
        size={Spacing.chromeIconSize}
        color={Colors.dark}
      />
      <View style={styles.text}>
        <Text style={styles.title}>{isPublic ? 'Public' : 'Private'}</Text>
        <Text style={styles.description}>
          {isPublic
            ? `Anyone can find and view this ${entityNoun}.`
            : `Only ${privateAudience} can view this ${entityNoun}.`}
        </Text>
      </View>
      <AppSwitch
        value={isPublic}
        onValueChange={(next) => onChange(next ? 'public' : 'private')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  text: {
    flex: 1,
  },
  title: {
    ...Typography.bodySecondaryStrong,
  },
  description: {
    ...Typography.bodySecondary,
    marginTop: Spacing.hairlineGap,
  },
});

export default PrivacySelector;
