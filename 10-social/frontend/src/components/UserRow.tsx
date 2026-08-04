import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Avatar from './Avatar';
import { userDisplayName } from '../utils/userName';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { Spacing } from '../constants/ScreenStyles';
import type { User } from '../services/api';

/** The avatar diameter in a list row: this row's own metric */
const ROW_AVATAR_SIZE = 48;

interface UserRowProps {
  user: Pick<User, 'first_name' | 'last_name' | 'email' | 'image_url'>;
  onPress: () => void;
  /** A muted second line: a follower tally on the Discover rail. Omit for none. */
  subtitle?: string;
}

/**
 * One tappable person in a list: avatar, name, and an optional muted subtitle.
 * The shared row behind Discover's search results and the followers/following
 * lists, so a person looks the same wherever they appear.
 */
const UserRow: React.FC<UserRowProps> = ({ user, onPress, subtitle }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={Opacity.pressed}
    accessibilityRole="button"
    accessibilityLabel={userDisplayName(user)}
    style={styles.row}
  >
    <Avatar imageUrl={user.image_url} name={userDisplayName(user)} size={ROW_AVATAR_SIZE} />
    <View style={styles.text}>
      <Text style={styles.name} numberOfLines={1}>
        {userDisplayName(user)}
      </Text>
      {subtitle !== undefined && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
  </TouchableOpacity>
);

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

export default UserRow;
