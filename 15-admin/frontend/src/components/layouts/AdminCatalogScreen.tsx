import React, { ComponentProps } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FloatingHeaderLayout from './FloatingHeaderLayout';
import EmptyStateView from '../EmptyStateView';
import HeaderIconButton from '../HeaderIconButton';
import { Spacing } from '../../constants/ScreenStyles';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface AdminCatalogScreenProps {
  title: string;
  loading: boolean;
  /** The header + and the empty state's CTA both add an entity — same label,
      same target — so the scaffold wires both from this one pair. */
  addLabel: string;
  onAdd: () => void;
  /** True once loaded with nothing to list: the empty state (CTA included)
      stands in for the rows. */
  isEmpty: boolean;
  empty: { icon: IoniconName; title: string; subtitle: string };
  /** The already-mapped rows (a CatalogRow each); the scaffold stays blind to
      which entity it lists. */
  children: React.ReactNode;
}

/**
 * The shell every admin directory shares: a floating-header screen with a +
 * that adds an entity, and a body that is either the gap-stacked rows or a
 * single empty state whose CTA is that same add. Each admin list screen keeps
 * only its fetch and its row.
 */
export default function AdminCatalogScreen({
  title,
  loading,
  addLabel,
  onAdd,
  isEmpty,
  empty,
  children,
}: AdminCatalogScreenProps) {
  return (
    <FloatingHeaderLayout
      title={title}
      showBack
      loading={loading}
      headerRight={
        <HeaderIconButton icon="add" accessibilityLabel={addLabel} onPress={onAdd} />
      }
    >
      {isEmpty ? (
        <EmptyStateView
          icon={empty.icon}
          title={empty.title}
          subtitle={empty.subtitle}
          actionLabel={addLabel}
          onAction={onAdd}
        />
      ) : (
        <View style={styles.list}>{children}</View>
      )}
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
});
