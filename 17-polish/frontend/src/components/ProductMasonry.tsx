import React from 'react';
import MasonryGrid from './MasonryGrid';
import ProductCard from './ProductCard';
import useMasonryColumns from '../hooks/useMasonryColumns';
import type { Product } from '../services/api';

interface ProductMasonryProps {
  products: Product[];
  onPressProduct: (product: Product) => void;
}

/**
 * The image-forward product grid shared by a store's detail and its admin
 * editor: a masonry of product tiles whose column count follows the device
 * width. The store detail opens each product; the admin grid opens its edit
 * form. The product-side mirror of WishMasonry.
 */
export default function ProductMasonry({ products, onPressProduct }: ProductMasonryProps) {
  const numColumns = useMasonryColumns();

  return (
    <MasonryGrid
      data={products}
      numColumns={numColumns}
      keyExtractor={(product) => product.id}
      renderItem={(product) => (
        <ProductCard product={product} onPress={() => onPressProduct(product)} />
      )}
    />
  );
}
