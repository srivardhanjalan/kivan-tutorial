import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import useOptimisticToggle from '../hooks/useOptimisticToggle';
import { followUser, unfollowUser } from '../services/api';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import BorderRadius from '../constants/BorderRadius';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

interface FollowButtonProps {
  userId: string;
  initialFollowing: boolean;
}

/**
 * The Follow / Following toggle on a profile. Optimistic: the label flips on
 * tap and rolls back with a toast if the request fails. Mounts only for OTHER
 * users (the profile hides it on your own), so its initial state is known.
 */
const FollowButton: React.FC<FollowButtonProps> = ({ userId, initialFollowing }) => {
  const { on: following, loading, toggle } = useOptimisticToggle({
    initialOn: initialFollowing,
    turnOn: () => followUser(userId),
    turnOff: () => unfollowUser(userId),
    errorMessage: 'Could not update follow',
  });

  return (
    <TouchableOpacity
      onPress={toggle}
      disabled={loading}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={following ? 'Following' : 'Follow'}
      style={[styles.pill, following ? styles.following : styles.follow, loading && CommonScreenStyles.dimmed]}
    >
      {loading ? (
        <ActivityIndicator color={following ? Colors.dark : Colors.white} />
      ) : (
        <Text style={[styles.label, !following && styles.followLabel]}>
          {following ? 'Following' : 'Follow'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    // Holds its width across the label swap and the spinner so nothing jumps
    minWidth: 116,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  follow: {
    backgroundColor: Colors.primary,
  },
  following: {
    backgroundColor: Colors.pressedFill,
  },
  label: {
    ...Typography.bodySecondaryStrong,
  },
  followLabel: {
    color: Colors.white,
  },
});

export default FollowButton;
