import React from 'react';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import HeaderIconButton from '../components/HeaderIconButton';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import { useToast } from '../components/ToastProvider';
import type { TabConfig } from '../config/tabs';

/**
 * Stand-in screen for every tab while the shell is domain-free. It exists
 * to exercise the design system end to end: the floating header (title +
 * right action), section headers, empty states, and toasts — all on the
 * standard layout. Later steps replace it with real screens.
 */
export default function PlaceholderScreen({ tab }: { tab: TabConfig }) {
  const toast = useToast();

  return (
    <FloatingHeaderLayout
      title={tab.title}
      headerRight={
        <HeaderIconButton
          icon="sparkles-outline"
          onPress={() => toast.show(`${tab.title} says hi — the shell works.`)}
        />
      }
    >
      <SectionHeader title="Coming soon" meta="0" />
      <EmptyStateView
        icon={tab.iconActive}
        title={`Nothing in ${tab.title} yet`}
        subtitle="This tab is part of the shell — its real screen arrives in a later step."
      />
    </FloatingHeaderLayout>
  );
}
