import React from 'react';
import { Image, StyleSheet } from 'react-native';
import AppConfig from '../config/app';

/** The brand mark at its standard display size — auth header, onboarding. */
const BrandMark: React.FC = () => (
  <Image source={AppConfig.branding.logo} style={styles.logo} resizeMode="contain" />
);

const styles = StyleSheet.create({
  logo: {
    width: AppConfig.branding.logoSize,
    height: AppConfig.branding.logoSize,
  },
});

export default BrandMark;
