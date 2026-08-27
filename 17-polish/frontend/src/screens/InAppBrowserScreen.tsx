import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import HeaderIconButton from '../components/HeaderIconButton';
import GlassPill from '../components/GlassPill';
import PrimaryButton from '../components/PrimaryButton';
import AddToWishlistModal from '../components/AddToWishlistModal';
import type { WishDraft } from '../components/AddToWishlistModal';
import { useToast } from '../components/ToastProvider';
import useAsyncAction from '../hooks/useAsyncAction';
import useFetch from '../hooks/useFetch';
import { scrapeProduct } from '../scrapers';
import { fetchBrands } from '../services/api';
import type { Brand } from '../services/api';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import hostOf from '../utils/hostOf';

/** How far the floating header slides up when hidden — enough to clear it and
    the top safe-area inset. */
const HEADER_HIDE_OFFSET = 120;

/** One brand in the switcher strip: its logo (or first letter), tinted when its
    site is the one you're currently on. */
function BrandSwitchButton({
  brand,
  active,
  onPress,
}: {
  brand: Brand;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${brand.name}`}
      style={[CommonScreenStyles.center, styles.brandButton, active && styles.brandButtonActive]}
    >
      {brand.logo_url ? (
        <Image source={{ uri: brand.logo_url }} style={styles.brandLogo} resizeMode="contain" />
      ) : (
        <Text style={styles.brandFallback}>{brand.name.slice(0, 1)}</Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * The in-app browser: a full-screen WebView opened on one real store (or a
 * pasted URL), with a floating translucent pill of chrome that auto-hides as you
 * scroll into a page. The pill carries a recent-brands strip — tap a brand's
 * logo to switch stores in one tap, the active site highlighted — plus close and
 * reload, and never shows the address. The bottom bar keeps back/forward and the
 * one prominent action: Add to wishlist, which scrapes THIS page through the
 * backend Firecrawl proxy and opens the add-a-wish modal prefilled with whatever
 * was found. A page that yields nothing still opens the modal, to fill by hand.
 */
export default function InAppBrowserScreen() {
  const navigation = useAppNavigation();
  const params = useAppRoute<'InAppBrowser'>().params;
  // Opened on a curated brand, or on a raw pasted URL. A brand stamps its id on
  // a captured wish (for the origin badge); a pasted-URL wish has no brand.
  const brand = 'brand' in params ? params.brand : null;
  const initialUrl = 'brand' in params ? params.brand.website_url : params.url;
  const toast = useToast();
  const { loading: scraping, run } = useAsyncAction();
  const { data: brands } = useFetch(fetchBrands);

  const webViewRef = useRef<WebView>(null);
  // The live URL, kept in a ref so Add reads the page you are on RIGHT NOW,
  // not a render-stale copy; the state copy drives the active-brand highlight.
  const currentUrlRef = useRef(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  // The WebView's source: changing it navigates, so a brand-strip tap sets it to
  // that brand's site. Internal navigation updates the refs, not this.
  const [sourceUri, setSourceUri] = useState(initialUrl);
  const [pageTitle, setPageTitle] = useState(brand ? brand.name : hostOf(initialUrl));
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [draft, setDraft] = useState<WishDraft | null>(null);

  // Auto-hide the floating header on scroll: down hides it, up (or the top)
  // brings it back, so a page reads full-bleed but the chrome is a flick away.
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerHidden = useRef(false);

  const setHeaderHidden = (hidden: boolean) => {
    if (headerHidden.current === hidden) return;
    headerHidden.current = hidden;
    Animated.timing(headerTranslateY, {
      toValue: hidden ? -HEADER_HIDE_OFFSET : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const onScroll = (y: number) => {
    if (y < 10) setHeaderHidden(false);
    else if (y > lastScrollY.current + 4) setHeaderHidden(true);
    else if (y < lastScrollY.current - 4) setHeaderHidden(false);
    lastScrollY.current = y;
  };

  const onNavStateChange = (navState: WebViewNavigation) => {
    currentUrlRef.current = navState.url;
    setCurrentUrl(navState.url);
    if (navState.title) setPageTitle(navState.title);
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
  };

  const addFromPage = () =>
    run(async () => {
      const url = currentUrlRef.current;
      const scraped = await scrapeProduct(url);
      const foundNothing =
        scraped.title === null && scraped.price === null && scraped.image === null;
      if (foundNothing) {
        toast.show('Could not read this page. Add the details yourself.', { type: 'error' });
      }
      // Open the modal either way: with what scraped, or just the URL + a name
      // to edit. The link always points at the page you were on.
      setDraft({
        name: scraped.title || pageTitle,
        cost: scraped.price,
        cost_currency: scraped.currency ?? null,
        link_url: url,
        image_url: scraped.image,
        // Stamp the brand only when the browser opened on one; a pasted-URL wish
        // carries no origin badge.
        ...(brand ? { brand_id: brand.id } : {}),
      });
    }, 'Could not read this page');

  const currentHost = hostOf(currentUrl);

  return (
    <SafeAreaView style={CommonScreenStyles.container} edges={['top', 'bottom']}>
      <WebView
        ref={webViewRef}
        source={{ uri: sourceUri }}
        onNavigationStateChange={onNavStateChange}
        onScroll={(e) => onScroll(e.nativeEvent.contentOffset.y)}
        contentInset={{ top: 56, left: 0, right: 0, bottom: 0 }}
        style={styles.web}
      />

      <View style={styles.bottomBar}>
        <HeaderIconButton
          icon="chevron-back"
          accessibilityLabel="Back"
          onPress={() => webViewRef.current?.goBack()}
          disabled={!canGoBack}
        />
        <HeaderIconButton
          icon="chevron-forward"
          accessibilityLabel="Forward"
          onPress={() => webViewRef.current?.goForward()}
          disabled={!canGoForward}
        />
        <View style={styles.addAction}>
          <PrimaryButton title="Add to wishlist" onPress={addFromPage} loading={scraping} />
        </View>
      </View>

      <Animated.View
        style={[styles.floatingHeader, { transform: [{ translateY: headerTranslateY }] }]}
        pointerEvents="box-none"
      >
        <GlassPill style={styles.headerPill}>
          <HeaderIconButton
            icon="close"
            accessibilityLabel="Close browser"
            onPress={() => navigation.goBack()}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}
          >
            {(brands ?? []).map((b) => (
              <BrandSwitchButton
                key={b.id}
                brand={b}
                active={hostOf(b.website_url) === currentHost}
                onPress={() => setSourceUri(b.website_url)}
              />
            ))}
          </ScrollView>
          <HeaderIconButton
            icon="reload"
            accessibilityLabel="Reload page"
            onPress={() => webViewRef.current?.reload()}
          />
        </GlassPill>
      </Animated.View>

      {draft && (
        <AddToWishlistModal visible draft={draft} onClose={() => setDraft(null)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  web: {
    flex: 1,
  },
  floatingHeader: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.md,
    right: Spacing.md,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  strip: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  brandButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  brandButtonActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  brandLogo: {
    width: 26,
    height: 26,
  },
  brandFallback: {
    ...Typography.bodySecondaryStrong,
    color: Colors.dark,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.contentHorizontal,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
  },
  addAction: {
    flex: 1,
  },
});
