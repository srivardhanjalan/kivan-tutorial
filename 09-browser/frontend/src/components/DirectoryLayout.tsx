import React, { ComponentProps } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FloatingHeaderLayout from './layouts/FloatingHeaderLayout';
import SectionHeader from './SectionHeader';
import EmptyStateView from './EmptyStateView';
import { Spacing } from '../constants/ScreenStyles';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** One titled group of already-rendered rows (a category of brands, the
    Stores list). `children` are the rows so this layout stays blind to which
    domain it is listing. */
interface DirectorySection {
  key: string;
  title: string;
  count: number;
  children: React.ReactNode;
}

interface DirectoryLayoutProps {
  title: string;
  loading: boolean;
  showBack?: boolean;
  /** An entry above the sections that survives the empty state (the Wish
      Store's browse-real-stores card). */
  header?: React.ReactNode;
  sections: DirectorySection[];
  /** True when there is nothing to list: the empty state replaces the
      sections, but any header entry stays. */
  isEmpty: boolean;
  empty: { icon: IoniconName; title: string; subtitle: string };
}

/**
 * The scaffold both reference-data directories share: a floating-header screen
 * whose body is an optional header entry, then titled sections of rows, or a
 * single empty state when there is nothing to list. The Wish Store (curated
 * stores) and the brand directory (real stores) are the same screen shape with
 * different rows, so the shell lives here once and each screen stays a fetch, a
 * row, and its sections.
 */
export default function DirectoryLayout({
  title,
  loading,
  showBack,
  header,
  sections,
  isEmpty,
  empty,
}: DirectoryLayoutProps) {
  return (
    <FloatingHeaderLayout title={title} loading={loading} showBack={showBack}>
      {header}
      {isEmpty ? (
        <EmptyStateView icon={empty.icon} title={empty.title} subtitle={empty.subtitle} />
      ) : (
        sections.map((section) => (
          <View key={section.key}>
            <SectionHeader title={section.title} meta={section.count} />
            <View style={styles.list}>{section.children}</View>
          </View>
        ))
      )}
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
});
