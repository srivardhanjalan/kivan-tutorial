import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import { Tabs, SearchTab, TabConfig, TabKey } from '../config/tabs';
import GlassPill from './GlassPill';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import HomeScreen from '../screens/HomeScreen';

// Tabs with a real screen; the rest stay placeholders until their step
const TabScreens: Partial<Record<TabKey, React.ComponentType>> = {
  HomeTab: HomeScreen,
};

// The param list comes from the config, so adding a tab there types the
// whole navigator automatically
const Tab = createBottomTabNavigator<Record<TabKey, undefined>>();

/** One tappable icon slot inside a pill */
function TabButton({
  tab,
  active,
  onPress,
}: {
  tab: TabConfig;
  active: boolean;
  onPress: () => void;
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
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const currentRoute = state.routes[state.index].name;
  return (
    <View style={[styles.tabBarWrapper, { bottom: Spacing.tabBarBottomMargin }]}>
      <View style={styles.tabBarContainer}>
        {/* Left pill: the main tabs */}
        <GlassPill style={styles.leftNavPill}>
          <View style={styles.pillContent}>
            {Tabs.map((tab) => (
              <TabButton
                key={tab.key}
                tab={tab}
                active={currentRoute === tab.key}
                onPress={() => navigation.navigate(tab.key)}
              />
            ))}
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
 * config/tabs.ts. Every tab mounts a PlaceholderScreen for now — later
 * steps replace these with real screens without touching the chrome.
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
            {() => (Screen ? <Screen /> : <PlaceholderScreen tab={tab} />)}
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
    paddingHorizontal: 4,
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
});
