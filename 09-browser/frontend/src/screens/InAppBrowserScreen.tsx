import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import HeaderIconButton from '../components/HeaderIconButton';
import PrimaryButton from '../components/PrimaryButton';
import AddToWishlistModal from '../components/AddToWishlistModal';
import type { WishDraft } from '../components/AddToWishlistModal';
import { useToast } from '../components/ToastProvider';
import useAsyncAction from '../hooks/useAsyncAction';
import { scrapeProduct } from '../scrapers';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

/** The hostname of a URL for the chrome subtitle, or the raw URL if it won't
    parse. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * The in-app browser: a full-screen WebView opened on one real store, with the
 * chrome to drive it (close, back, forward, reload) and one prominent action:
 * Add to wishlist. You browse to a product page the ordinary way; Add scrapes
 * THAT page's URL through the backend Firecrawl proxy (scrapeProduct) and opens
 * the add-a-wish modal prefilled with whatever was found (title, price, its
 * currency, image). A page that yields nothing still opens the modal, so you
 * can fill the wish in by hand rather than dead-end.
 */
export default function InAppBrowserScreen() {
  const navigation = useAppNavigation();
  const { brand } = useAppRoute<'InAppBrowser'>().params;
  const toast = useToast();
  const { loading: scraping, run } = useAsyncAction();

  const webViewRef = useRef<WebView>(null);
  // The live URL, kept in a ref so Add reads the page you are on RIGHT NOW,
  // not a render-stale copy.
  const currentUrlRef = useRef(brand.website_url);
  const [pageTitle, setPageTitle] = useState(brand.name);
  const [host, setHost] = useState(hostOf(brand.website_url));
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [draft, setDraft] = useState<WishDraft | null>(null);

  const onNavStateChange = (navState: WebViewNavigation) => {
    currentUrlRef.current = navState.url;
    setHost(hostOf(navState.url));
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
      });
    }, 'Could not read this page');

  return (
    <SafeAreaView style={CommonScreenStyles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <HeaderIconButton icon="close" accessibilityLabel="Close browser" onPress={() => navigation.goBack()} />
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>{pageTitle}</Text>
          <Text style={styles.host} numberOfLines={1}>{host}</Text>
        </View>
        <HeaderIconButton icon="reload" accessibilityLabel="Reload page" onPress={() => webViewRef.current?.reload()} />
      </View>

      <WebView
        ref={webViewRef}
        source={{ uri: brand.website_url }}
        onNavigationStateChange={onNavStateChange}
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

      {draft && (
        <AddToWishlistModal visible draft={draft} onClose={() => setDraft(null)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.contentHorizontal,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    ...Typography.bodySecondaryStrong,
  },
  host: {
    ...Typography.bodySecondary,
    fontSize: 13,
  },
  web: {
    flex: 1,
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
