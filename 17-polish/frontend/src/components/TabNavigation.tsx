import React, { useCallback, useEffect, useState } from 'react';
import formatUnreadCount from '../utils/formatUnreadCount';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import { ChromeMaxFontSizeMultiplier } from '../constants/Typography';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import { Tabs, SearchTab, TabConfig, TabKey } from '../config/tabs';
import { fetchUnreadNotificationCount } from '../services/api';
import GlassPill from './GlassPill';
import HomeScreen from '../screens/HomeScreen';
import MyStuffScreen from '../screens/MyStuffScreen';
import StorefrontsScreen from '../screens/StorefrontsScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

// Every tab now has a real screen — the map is total over TabKey
const TabScreens: Record<TabKey, React.ComponentType> = {
  HomeTab: HomeScreen,
  AddWishTab: StorefrontsScreen,
  MyStuffTab: MyStuffScreen,
  NotificationsTab: NotificationsScreen,
  DiscoverTab: DiscoverScreen,
};

// The param list comes from the config, so adding a tab there types the
// whole navigator automatically
const Tab = createBottomTabNavigator<Record<TabKey, undefined>>();

/** One tappable icon slot inside a pill. The notifications tab passes an unread
    count, badged over the icon (capped at 99+) when there's anything unread. */
function TabButton({
  tab,
  active,
  onPress,
  badgeCount = 0,
}: {
  tab: TabConfig;
  active: boolean;
  onPress: () => void;
  badgeCount?: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[CommonScreenStyles.center, styles.tabButton, active && styles.tabButtonActive]}
      accessibilityRole="button"
      accessibilityLabel={tab.title}
    >
      <Ionicons
        name={active ? tab.iconActive : tab.icon}
        size={Spacing.tabIconSize}
        color={active ? Colors.primary : Colors.textSecondary}
      />
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText} maxFontSizeMultiplier={ChromeMaxFontSizeMultiplier}>
            {formatUnreadCount(badgeCount)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const currentRoute = state.routes[state.index].name;
  const [unreadCount, setUnreadCount] = useState(0);

  // The unread badge stays live the way the source's does: fetched on mount,
  // polled every 30s, and refetched the moment the notifications tab is opened
  // (where the count is about to drop as rows are read).
  const refreshUnread = useCallback(() => {
    fetchUnreadNotificationCount()
      .then(setUnreadCount)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshUnread();
    const interval = setInterval(refreshUnread, 30000);
    return () => clearInterval(interval);
  }, [refreshUnread]);

  return (
    <View style={[styles.tabBarWrapper, { bottom: Spacing.tabBarBottomMargin }]}>
      <View style={styles.tabBarContainer}>
        {/* Left pill: the main tabs */}
        <GlassPill style={styles.leftNavPill}>
          <View style={styles.pillContent}>
            {Tabs.map((tab) => {
              const isNotifications = tab.key === 'NotificationsTab';
              return (
                <TabButton
                  key={tab.key}
                  tab={tab}
                  active={currentRoute === tab.key}
                  badgeCount={isNotifications ? unreadCount : 0}
                  onPress={() => {
                    navigation.navigate(tab.key);
                    if (isNotifications) refreshUnread();
                  }}
                />
              );
            })}
          </View>
        </GlassPill>

        {/* Right pill: search/discover */}
        <GlassPill style={styles.rightNavPill}>
          <View style={styles.pillContent}>
            <TabButton
              tab={SearchTab}
              active={currentRoute === SearchTab.key}
              onPress={() => navigation.navigate(SearchTab.key)}
            />
          </View>
        </GlassPill>
      </View>
    </View>
  );
}

/**
 * The app shell: a bottom-tab navigator whose tabs come entirely from
 * config/tabs.ts. Every tab now mounts its real screen (the map is total
 * over TabKey), so the chrome stays untouched as screens evolve.
 */
export default function TabNavigation() {
  return (
    <Tab.Navigator
      id={undefined}
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {[...Tabs, SearchTab].map((tab) => {
        const Screen = TabScreens[tab.key];
        return (
          <Tab.Screen key={tab.key} name={tab.key}>
            {() => <Screen />}
          </Tab.Screen>
        );
      })}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    width: '92%',
    maxWidth: 500,
  },
  leftNavPill: {
    flex: 1,
  },
  rightNavPill: {
    width: 76,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.chromePillPadding,
  },
  tabButton: {
    flex: 1,
    height: Spacing.chromePillInnerHeight,
    borderRadius: BorderRadius.full,
  },
  tabButtonActive: {
    backgroundColor: Colors.pressedFill,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
