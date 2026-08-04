import React from 'react';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import DirectoryLayout from '../components/DirectoryLayout';
import CatalogRow from '../components/CatalogRow';
import { fetchStorefronts } from '../services/api';
import type { Storefront } from '../services/api';

/**
 * The Wish Store tab: the curated catalog of stores, plus the bridge to the
 * real web (the browse-real-stores card, which opens the brand directory).
 * Each store opens to its products, and a product adds itself to one of your
 * wishlists: the catalog path to a wish, alongside the manual form. The stores
 * are seeded reference data, so this loads once on mount.
 */
export default function StorefrontsScreen() {
  const navigation = useAppNavigation();
  const { data: storefronts, loading } = useFetch(fetchStorefronts);

  // The bridge to the real web sits above the catalog and survives the empty
  // state, so it rides the layout's header slot rather than the store list.
  const browseCard = (
    <CatalogRow
      icon="globe-outline"
      title="Browse real stores"
      accessibilityLabel="Browse real stores"
      description="Open a real brand's site and add any product to a wishlist."
      showChevron
      onPress={() => navigation.navigate('Brands')}
    />
  );

  const sections = [
    {
      key: 'stores',
      title: 'Stores',
      count: storefronts?.length ?? 0,
      children: storefronts?.map((storefront: Storefront) => (
        <CatalogRow
          key={storefront.id}
          icon="storefront-outline"
          logoUrl={storefront.logo_url}
          title={storefront.name}
          accessibilityLabel={storefront.name}
          description={storefront.description}
          meta={[
            {
              icon: 'pricetag-outline',
              text: `${storefront.product_count} ${storefront.product_count === 1 ? 'product' : 'products'}`,
            },
          ]}
          onPress={() => navigation.navigate('StorefrontDetail', { storefront })}
        />
      )),
    },
  ];

  return (
    <DirectoryLayout
      title="Wish Store"
      loading={loading}
      header={browseCard}
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
