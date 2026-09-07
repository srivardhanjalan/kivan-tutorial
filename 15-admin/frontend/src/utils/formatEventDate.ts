const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * A stored event_date (an ISO string, or null) rendered for a card subtitle or
 * a detail row. Null or an unparseable value reads as "Date TBD" rather than a
 * broken string: an event needs a title, not a date. Formatted by hand from a
 * month table so it needs no Intl locale data on the device.
 */
export default function formatEventDate(iso: string | null): string {
  if (!iso) {
    return 'Date TBD';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Date TBD';
  }
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
