/** The one spelling of the unread-count display rule: past 99 the exact
    number stops mattering and the badge reads 99+. The tab badge and the
    notifications header pill both show this same count, so they share the
    one cap. */
export default function formatUnreadCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}
