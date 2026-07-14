import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Shadows from '../constants/Shadows';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import { Tabs, SearchTab, TabConfig, TabKey } from '../config/tabs';
import PlaceholderScreen from '../screens/PlaceholderScreen';

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

/** Glass pill wrapper: BlurView on iOS, near-opaque white on Android */
function Pill({ style, children }: { style?: any; children: React.ReactNode }) {
  return Platform.OS === 'ios' ? (
    <BlurView intensity={80} tint="light" style={[styles.pillBlur, style]}>
      <View style={styles.pillContent}>{children}</View>
    </BlurView>
  ) : (
    <View style={[styles.pillBlur, styles.androidPill, style]}>
      <View style={styles.pillContent}>{children}</View>
    </View>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const currentRoute = state.routes[state.index].name;
  return (
    <View style={[styles.tabBarWrapper, { bottom: Spacing.tabBarBottomMargin }]}>
      <View style={styles.tabBarContainer}>
        {/* Left pill: the main tabs */}
        <View style={styles.leftNavPill}>
          <Pill>
            {Tabs.map((tab) => (
              <TabButton
                key={tab.key}
                tab={tab}
                active={currentRoute === tab.key}
                onPress={() => navigation.navigate(tab.key)}
              />
            ))}
          </Pill>
        </View>

        {/* Right pill: search/discover */}
        <View style={styles.rightNavPill}>
          <Pill>
            <TabButton
              tab={SearchTab}
              active={currentRoute === SearchTab.key}
              onPress={() => navigation.navigate(SearchTab.key)}
            />
          </Pill>
        </View>
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
      {[...Tabs, SearchTab].map((tab) => (
        <Tab.Screen key={tab.key} name={tab.key}>
          {() => <PlaceholderScreen tab={tab} />}
        </Tab.Screen>
      ))}
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
    gap: 12,
    width: '92%',
    maxWidth: 500,
  },
  leftNavPill: {
    flex: 1,
  },
  rightNavPill: {
    width: 76,
  },
  pillBlur: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.chrome,
  },
  androidPill: {
    backgroundColor: Colors.glassFallback,
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
