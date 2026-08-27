import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import DirectoryLayout from '../components/DirectoryLayout';
import CatalogRow from '../components/CatalogRow';
import FormInput from '../components/FormInput';
import StorefrontGrid from '../components/StorefrontGrid';
import { useToast } from '../components/ToastProvider';
import { isValidProductUrl, normalizeUrl } from '../utils/productUrl';
import { fetchStorefronts } from '../services/api';
import { Spacing } from '../constants/ScreenStyles';

/**
 * The Wish Store tab: the curated catalog of stores, plus two bridges to the
 * real web — paste a product link to open it directly, or browse the brand
 * directory. Each store opens to its products, and a product adds itself to one
 * of your wishlists: the catalog path to a wish, alongside the manual form. The
 * stores are seeded reference data, so this loads once on mount.
 */
export default function StorefrontsScreen() {
  const navigation = useAppNavigation();
  const toast = useToast();
  const { data: storefronts, loading } = useFetch(fetchStorefronts);
  const [linkUrl, setLinkUrl] = useState('');

  // Paste any product URL and open it in the in-app browser to scrape it — the
  // same capture flow the brand directory reaches, without picking a store.
  const openLink = () => {
    if (!isValidProductUrl(linkUrl)) {
      toast.show('Enter a valid product link', { type: 'error' });
      return;
    }
    const url = normalizeUrl(linkUrl);
    setLinkUrl('');
    navigation.navigate('InAppBrowser', { url });
  };

  // The bridges to the real web sit above the catalog and survive the empty
  // state, so they ride the layout's header slot rather than the store list.
  const header = (
    <View style={styles.header}>
      <FormInput
        value={linkUrl}
        onChangeText={setLinkUrl}
        placeholder="Paste a product link"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="go"
        onSubmitEditing={openLink}
      />
      <CatalogRow
        icon="globe-outline"
        title="Browse real stores"
        accessibilityLabel="Browse real stores"
        description="Open a real brand's site and add any product to a wishlist."        onPress={() => navigation.navigate('Brands')}
      />
    </View>
  );

  const sections = [
    {
      key: 'stores',
      title: 'Stores',
      count: storefronts?.length ?? 0,
      children: (
        <StorefrontGrid
          storefronts={storefronts}
          onPressStorefront={(storefront) => navigation.navigate('StorefrontDetail', { storefront })}
        />
      ),
    },
  ];

  return (
    <DirectoryLayout
      title="Wish Store"
      loading={loading}
      header={header}
      sections={sections}
      isEmpty={!!storefronts && storefronts.length === 0}
      empty={{
        icon: 'storefront-outline',
        title: 'No stores yet',
        subtitle: 'The curated catalog is empty. Seed it (see the step README) to browse stores here.',
      }}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.sm,
  },
});
