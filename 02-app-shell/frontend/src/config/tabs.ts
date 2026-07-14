import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface TabConfig {
  /** Route name (stable key — later steps mount real screens on these) */
  key: string;
  /** Header title shown by the placeholder screen */
  title: string;
  icon: IoniconName;
  iconActive: IoniconName;
}

/**
 * The left glass pill's tabs, in order. Swapping the app's domain starts
 * here and in app.ts: rename a tab, and every screen that mounts on its
 * key follows. The search tab lives in its own right-hand pill and is
 * configured separately below.
 */
export const Tabs = [
  { key: 'HomeTab', title: 'Home', icon: 'home-outline', iconActive: 'home' },
  { key: 'AddWishTab', title: 'Wish Store', icon: 'gift-outline', iconActive: 'gift' },
  { key: 'MyStuffTab', title: 'My Stuff', icon: 'layers-outline', iconActive: 'layers' },
  { key: 'NotificationsTab', title: 'Notifications', icon: 'notifications-outline', iconActive: 'notifications' },
] as const satisfies readonly TabConfig[];

export const SearchTab = {
  key: 'DiscoverTab',
  title: 'Discover',
  icon: 'search-outline',
  iconActive: 'search',
} as const satisfies TabConfig;

/** Route-name union derived from the config — navigators type against this */
export type TabKey = (typeof Tabs)[number]['key'] | (typeof SearchTab)['key'];
