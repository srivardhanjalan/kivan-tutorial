import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import TabNavigation from './TabNavigation';
import OnboardingTutorial from './OnboardingTutorial';
import LoadingView from './LoadingView';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WishlistFormScreen from '../screens/WishlistFormScreen';
import WishlistDetailScreen from '../screens/WishlistDetailScreen';
import EventFormScreen from '../screens/EventFormScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import WishFormScreen from '../screens/WishFormScreen';
import WishDetailScreen from '../screens/WishDetailScreen';
import StorefrontDetailScreen from '../screens/StorefrontDetailScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import BrandsScreen from '../screens/BrandsScreen';
import InAppBrowserScreen from '../screens/InAppBrowserScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import FollowListScreen from '../screens/FollowListScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import AdminHomeScreen from '../screens/AdminHomeScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminBrandsScreen from '../screens/AdminBrandsScreen';
import AdminBrandFormScreen from '../screens/AdminBrandFormScreen';
import AdminLifeEventsScreen from '../screens/AdminLifeEventsScreen';
import AdminLifeEventFormScreen from '../screens/AdminLifeEventFormScreen';
import {
  setAuthTokenGetter,
  fetchOnboardingCompleted,
  completeOnboarding,
} from '../services/api';
import type {
  Wishlist,
  Wish,
  Storefront,
  Product,
  Brand,
  Event,
  LifeEvent,
} from '../services/api';
import { parseDeepLink, DEEP_LINK_PREFIX } from '../utils/deepLinks';
import type { DeepLinkTarget } from '../utils/deepLinks';

/** The signed-in stack: the tab shell, plus every screen pushed over it */
export type RootStackParamList = {
  Tabs: undefined;
  Settings: undefined;
  /** The per-type mute preferences, pushed from Settings */
  NotificationSettings: undefined;
  /** Create (no param) or edit (the wishlist) one wishlist */
  WishlistForm: { wishlist?: Wishlist };
  WishlistDetail: { wishlistId: string };
  /** Create (wishlist only) or edit (the wish) one wish */
  WishForm: { wishlistId: string; wish?: Wish };
  WishDetail: { wishId: string };
  /** Create (no param) or edit (the event) one event */
  EventForm: { event?: Event };
  EventDetail: { eventId: string };
  /** One curated store's products (the store is passed, not refetched) */
  StorefrontDetail: { storefront: Storefront };
  /** One catalog product, with the add-to-wishlist action */
  ProductDetail: { product: Product };
  /** The real-store directory, grouped by category */
  Brands: undefined;
  /** The in-app browser opened on one real store (the brand is passed) */
  InAppBrowser: { brand: Brand };
  /** A user's public profile, reached from Discover or a follow list. Only the
      id is passed: the profile fetches the record. */
  UserProfile: { userId: string };
  /** The followers or following list behind a profile's counts */
  FollowList: { userId: string; mode: 'followers' | 'following' };
  /** The admin dashboard home, reached only from the role-gated Settings row */
  AdminHome: undefined;
  /** The user roster with promote/demote */
  AdminUsers: undefined;
  /** The brand directory admin list */
  AdminBrands: undefined;
  /** Create (no param) or edit (the brand) one brand */
  AdminBrandForm: { brand?: Brand };
  /** The life-events taxonomy admin list */
  AdminLifeEvents: undefined;
  /** Create (no param) or edit (the life event) one occasion */
  AdminLifeEventForm: { lifeEvent?: LifeEvent };
  /** The storefront catalog admin list */
  AdminStorefronts: undefined;
  /** Create (no param) or edit (the storefront) one store */
  AdminStorefrontForm: { storefront?: Storefront };
  /** One store's products admin list (the store is passed, not refetched) */
  AdminStorefrontProducts: { storefront: Storefront };
  /** Create (store only) or edit (the product) one product under a store */
  AdminProductForm: { storefront: Storefront; product?: Product };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep links are routed by hand (see the effects below), not by React
// Navigation's path->screen mapping: the target screen depends on auth state, so
// getStateFromPath returns undefined to keep the automatic router out of it
// while still registering the kivan:// prefix.
const linking = {
  prefixes: [DEEP_LINK_PREFIX],
  getStateFromPath: () => undefined,
};

// After sign-in the NavigationContainer mounts and wires its ref on the same
// render a pending link is replayed; this brief wait lets the ref settle before
// we navigate (a cold-start link opened straight from a share).
const NAV_REPLAY_DELAY_MS = 500;

/**
 * The auth gate: signed out shows the sign-in/sign-up pair (a simple local
 * swap), signed in shows a stack — the tab shell at its root, Settings the
 * first screen ever pushed over it. Also shows the one-time first-run
 * tutorial and wires Clerk session tokens into the API client.
 */
export default function Navigation() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [authScreen, setAuthScreen] = useState<'signIn' | 'signUp'>('signIn');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  // A deep link waiting for the container to be ready and the user signed in.
  // Signed-out links (the common case for a share opened by a new user) park
  // here through the whole sign-in flow, then replay.
  const [pendingLink, setPendingLink] = useState<DeepLinkTarget | null>(null);

  // Wired during render, not in an effect: children fire authenticated
  // requests from their own mount effects, which run before a parent's.
  setAuthTokenGetter(() => getToken());

  // Signing out always lands on Sign In, wherever the toggle was left
  useEffect(() => {
    if (!isSignedIn) setAuthScreen('signIn');
  }, [isSignedIn]);

  // On sign-in, ask the backend whether the first-run tutorial was already
  // completed (it's on the user record, so reinstalls don't replay it).
  // This is often the user's very first authenticated request — the one
  // that JIT-provisions their record.
  useEffect(() => {
    if (!isSignedIn) return;
    let mounted = true;
    fetchOnboardingCompleted()
      .then((done) => mounted && setShowOnboarding(!done))
      .catch((e: Error) => console.warn(`Onboarding check skipped: ${e.message}`));
    return () => {
      mounted = false;
    };
  }, [isSignedIn]);

  // Route one resolved link to its screen. Narrowed per screen so each navigate
  // gets the exact params its route expects.
  const navigateToTarget = (target: DeepLinkTarget) => {
    const nav = navigationRef.current;
    if (!nav) return;
    switch (target.screen) {
      case 'WishlistDetail':
        nav.navigate('WishlistDetail', target.params);
        break;
      case 'UserProfile':
        nav.navigate('UserProfile', target.params);
        break;
      case 'EventDetail':
        nav.navigate('EventDetail', target.params);
        break;
    }
  };

  // Cold start: the URL the app was launched from (a share tapped while Kivan
  // was closed). Parked as a pending link and replayed once signed in.
  useEffect(() => {
    if (!isLoaded) return;
    let active = true;
    Linking.getInitialURL().then((url) => {
      if (!active || !url || url.includes('expo-development-client')) return;
      const target = parseDeepLink(url);
      if (target) setPendingLink(target);
    });
    return () => {
      active = false;
    };
  }, [isLoaded]);

  // Warm: a link tapped while Kivan is already running. Same parking spot, so a
  // signed-out warm link waits for sign-in just like a cold one.
  useEffect(() => {
    if (!isLoaded) return;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('expo-development-client')) return;
      const target = parseDeepLink(url);
      if (target) setPendingLink(target);
    });
    return () => subscription.remove();
  }, [isLoaded]);

  // Replay a parked link once the user is signed in and the container is up. One
  // path for both cold and warm links, so auth gating lives in exactly one place.
  useEffect(() => {
    if (!isSignedIn || !pendingLink) return;
    const target = pendingLink;
    const timer = setTimeout(() => {
      navigateToTarget(target);
      setPendingLink(null);
    }, NAV_REPLAY_DELAY_MS);
    return () => clearTimeout(timer);
    // navigateToTarget reads a ref, so it needn't be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, pendingLink]);

  const handleOnboardingDismiss = () => {
    setShowOnboarding(false);
    completeOnboarding().catch((e: Error) =>
      console.warn(`Could not persist onboarding completion: ${e.message}`)
    );
  };

  if (!isLoaded) {
    return <LoadingView />;
  }

  if (!isSignedIn) {
    return authScreen === 'signIn' ? (
      <SignInScreen onSwitchToSignUp={() => setAuthScreen('signUp')} />
    ) : (
      <SignUpScreen onSwitchToSignIn={() => setAuthScreen('signIn')} />
    );
  }

  return (
    <>
      <NavigationContainer ref={navigationRef} linking={linking}>
        <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={TabNavigation} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
          <Stack.Screen name="WishlistForm" component={WishlistFormScreen} />
          <Stack.Screen name="WishlistDetail" component={WishlistDetailScreen} />
          <Stack.Screen name="WishForm" component={WishFormScreen} />
          <Stack.Screen name="WishDetail" component={WishDetailScreen} />
          <Stack.Screen name="EventForm" component={EventFormScreen} />
          <Stack.Screen name="EventDetail" component={EventDetailScreen} />
          <Stack.Screen name="StorefrontDetail" component={StorefrontDetailScreen} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="Brands" component={BrandsScreen} />
          <Stack.Screen name="InAppBrowser" component={InAppBrowserScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="FollowList" component={FollowListScreen} />
          <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
          <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
          <Stack.Screen name="AdminBrands" component={AdminBrandsScreen} />
          <Stack.Screen name="AdminBrandForm" component={AdminBrandFormScreen} />
          <Stack.Screen name="AdminLifeEvents" component={AdminLifeEventsScreen} />
          <Stack.Screen name="AdminLifeEventForm" component={AdminLifeEventFormScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <OnboardingTutorial visible={showOnboarding} onDismiss={handleOnboardingDismiss} />
    </>
  );
}
