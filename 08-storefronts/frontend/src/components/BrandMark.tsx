import React from 'react';
import { Image } from 'react-native';
import AppConfig from '../config/app';

/** The one spelling of "render the brand mark" — auth header and onboarding
    at the standard size, the loader smaller via `size`. */
const BrandMark: React.FC<{ size?: number }> = ({ size = AppConfig.branding.logoSize }) => (
  <Image source={AppConfig.branding.logo} style={{ width: size, height: size }} resizeMode="contain" />
);

export default BrandMark;
