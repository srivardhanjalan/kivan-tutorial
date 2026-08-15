import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import BorderRadius from '../constants/BorderRadius';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

interface FollowButtonProps {
  following: boolean;
  loading: boolean;
  onPress: () => void;
}

/**
 * The Follow / Following pill on a profile. Presentational: the parent owns the
 * optimistic toggle (so the visible follower tally and this label move together,
 * the same way a love moves its own tally) and passes the current state down.
 * Rendered only for OTHER users (the profile hides it on your own).
 */
const FollowButton: React.FC<FollowButtonProps> = ({ following, loading, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
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
