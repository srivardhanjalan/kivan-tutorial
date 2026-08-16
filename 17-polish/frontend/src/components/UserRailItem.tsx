import React from 'react';
import { Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Avatar from './Avatar';
import { userDisplayName } from '../utils/userName';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import type { User } from '../services/api';

const RAIL_AVATAR_SIZE = 64;
const ITEM_WIDTH = 84;

type RailUser = Pick<User, 'id' | 'first_name' | 'last_name' | 'email' | 'image_url'>;

/** One person in a horizontal rail: a circular avatar over a clamped name. */
function UserRailItem({ user, onPress }: { user: RailUser; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[CommonScreenStyles.center, styles.item]}
      onPress={onPress}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={userDisplayName(user)}
    >
      <Avatar imageUrl={user.image_url} name={userDisplayName(user)} size={RAIL_AVATAR_SIZE} />
      <Text style={styles.name} numberOfLines={1}>{userDisplayName(user)}</Text>
    </TouchableOpacity>
  );
}

interface UserRailProps {
  users: RailUser[];
  onPressUser: (id: string) => void;
}

/**
 * A horizontal rail of circular people avatars: the image-forward form the
 * Discover, Following, and Followers tabs share, replacing the vertical rows.
 * Each avatar opens that person's profile (where the follow lives).
 */
const UserRail: React.FC<UserRailProps> = ({ users, onPressUser }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={CommonScreenStyles.horizontalRail}>
    {users.map((user) => (
      <UserRailItem key={user.id} user={user} onPress={() => onPressUser(user.id)} />
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  item: {
    width: ITEM_WIDTH,
  },
  name: {
    ...Typography.bodySecondaryStrong,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});

export default UserRail;
