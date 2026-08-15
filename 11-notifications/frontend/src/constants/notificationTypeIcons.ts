import { Ionicons } from '@expo/vector-icons';
import type { NotificationType } from '../services/api';

/** The one glyph that identifies each notification type, everywhere a type
    shows its face: the feed row's badge and the settings row share it, so
    the two screens cannot drift to different icons for one type. */
const NOTIFICATION_TYPE_ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  follow: 'person-add',
  wishlist_created: 'list',
  wish_added: 'gift',
  wishlist_loved: 'heart',
};

export default NOTIFICATION_TYPE_ICON;
