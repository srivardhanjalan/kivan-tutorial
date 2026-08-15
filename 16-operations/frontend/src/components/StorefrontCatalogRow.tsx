import React from 'react';
import CatalogRow from './CatalogRow';
import { pluralize } from '../utils/pluralize';
import type { Storefront } from '../services/api';

interface StorefrontCatalogRowProps {
  storefront: Storefront;
  onPress: () => void;
  /** The admin directory shows a chevron (a row opens its editor); the Wish
      Store row does not. */
  showChevron?: boolean;
}

/**
 * One curated store as a catalog row — logo, name, description, and its
 * denormalized product count — shared by the Wish Store and the admin
 * directory, which present the same store the same way and differ only in
 * where the tap goes.
 */
export default function StorefrontCatalogRow({
  storefront,
  onPress,
  showChevron,
}: StorefrontCatalogRowProps) {
  return (
    <CatalogRow
      icon="storefront-outline"
      logoUrl={storefront.logo_url}
      title={storefront.name}
      accessibilityLabel={storefront.name}
      description={storefront.description}
      meta={[
        { icon: 'pricetag-outline', text: pluralize(storefront.product_count, 'product') },
      ]}
      showChevron={showChevron}
      onPress={onPress}
    />
  );
}
