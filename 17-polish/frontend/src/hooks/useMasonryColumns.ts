import { useWindowDimensions } from 'react-native';

/**
 * How many masonry columns to lay out at the current device width: two on a
 * phone, three past a small tablet, four past a large one. The wish feed (Home,
 * a profile) and the product grids (a store's products, the admin's) all pick
 * their column count from here, so a breakpoint change lands everywhere at once.
 */
export default function useMasonryColumns(): number {
  const { width } = useWindowDimensions();
  return width >= 768 ? 4 : width >= 600 ? 3 : 2;
}
