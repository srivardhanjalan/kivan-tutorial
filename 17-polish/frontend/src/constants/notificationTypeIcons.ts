import { Ionicons } from '@expo/vector-icons';
import type { NotificationType } from '../services/api';

/** The glyph that identifies each notification type on the feed row's badge —
    one map for every type, so a new type's icon is added in a single place. */
const NOTIFICATION_TYPE_ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  follow: 'person-add',
  wishlist_created: 'list',
  wish_added: 'gift',
  wishlist_loved: 'heart',
  event_created: 'calendar',
  event_invitation: 'mail',
};

export default NOTIFICATION_TYPE_ICON;
