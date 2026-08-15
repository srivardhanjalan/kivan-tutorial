import React from 'react';
import ModalCard from './ModalCard';
import SelectableRow from './SelectableRow';
import SelectableList from './SelectableList';
import PrimaryButton from './PrimaryButton';

interface CategoryFilterModalProps {
  visible: boolean;
  /** The store's distinct product categories, in display order */
  categories: string[];
  /** The active filter, or null for "All" (no filter) */
  selected: string | null;
  /** Picks a category (or null for All); the caller closes the modal */
  onSelect: (category: string | null) => void;
  onClose: () => void;
}

/**
 * The store screen's category funnel: a single-select list of the store's
 * categories plus "All", each row the shared SelectableRow. Picking one filters
 * the product grid and closes the sheet; Cancel dismisses without changing the
 * filter. Only raised when a store has more than one category.
 */
export default function CategoryFilterModal({
  visible,
  categories,
  selected,
  onSelect,
  onClose,
}: CategoryFilterModalProps) {
  return (
    <ModalCard
      visible={visible}
      title="Filter by category"
      message="Show products from one category, or all of them."
    >
      <SelectableList>
        <SelectableRow label="All" selected={selected === null} onPress={() => onSelect(null)} />
        {categories.map((category) => (
          <SelectableRow
            key={category}
            label={category}
            selected={category === selected}
            onPress={() => onSelect(category)}
          />
        ))}
      </SelectableList>
      <PrimaryButton title="Cancel" variant="secondary" onPress={onClose} />
    </ModalCard>
  );
}
