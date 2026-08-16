import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Avatar, { LIST_ROW_AVATAR_SIZE } from './Avatar';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { Spacing } from '../constants/ScreenStyles';

interface PersonRowProps {
  imageUrl?: string;
  /** The strong first line, and the avatar's fallback initials. */
  name: string;
  /** A muted second line: a follower tally, an email, an RSVP. Omit for none. */
  subtitle?: string;
  /** Tints the subtitle (an RSVP accent); the muted default otherwise. */
  subtitleColor?: string;
  /** Makes the whole row tappable (opening a profile, inviting a user). A row
      without it is a plain, non-interactive line. */
  onPress?: () => void;
  /** A trailing control on the right, e.g. a host's remove button. */
  trailing?: React.ReactNode;
}

/**
 * One person in a list: avatar, name, and an optional muted second line, with an
 * optional trailing control. The shared row look behind Discover's results, the
 * followers/following lists, and an event's guest list, so a person reads the
 * same wherever they appear.
 */
const PersonRow: React.FC<PersonRowProps> = ({
  imageUrl,
  name,
  subtitle,
  subtitleColor,
  onPress,
  trailing,
}) => {
  const body = (
    <>
      <Avatar imageUrl={imageUrl} name={name} size={LIST_ROW_AVATAR_SIZE} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {subtitle !== undefined && (
          <Text
            style={[styles.subtitle, subtitleColor ? { color: subtitleColor } : null]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {trailing}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={Opacity.pressed}
        accessibilityRole="button"
        accessibilityLabel={name}
        style={styles.row}
      >
        {body}
      </TouchableOpacity>
    );
  }
  return <View style={styles.row}>{body}</View>;
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  text: {
    flex: 1,
  },
  name: {
    ...Typography.bodySecondaryStrong,
  },
  subtitle: {
    ...Typography.bodySecondary,
    marginTop: Spacing.hairlineGap,
  },
});

export default PersonRow;
