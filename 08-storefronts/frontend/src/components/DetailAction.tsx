import React from 'react';
import { View, StyleSheet } from 'react-native';
import PrimaryButton from './PrimaryButton';
import { Spacing } from '../constants/ScreenStyles';

type DetailActionProps = React.ComponentProps<typeof PrimaryButton>;

/**
 * A full-width detail-screen action: a PrimaryButton carrying the standard gap
 * above it. The wish detail and product detail stack their actions (open a
 * link, add to a wishlist, toggle fulfilled) this way, so the spacing lives
 * here once instead of a wrapper and a repeated style on each screen.
 */
const DetailAction: React.FC<DetailActionProps> = (props) => (
  <View style={styles.container}>
    <PrimaryButton {...props} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
  },
});

export default DetailAction;
