import React from 'react';
import ShareLinkModal from './ShareLinkModal';
import { DEEP_LINK_PREFIX } from '../utils/deepLinks';

interface ShareWishlistModalProps {
  visible: boolean;
  wishlistId: string;
  wishlistName: string;
  onClose: () => void;
}

/** Share one wishlist: composes its `kivan://wishlist/<id>` link and copy, then
    hands off to the shared share surface. */
const ShareWishlistModal: React.FC<ShareWishlistModalProps> = ({
  visible,
  wishlistId,
  wishlistName,
  onClose,
}) => {
  const link = `${DEEP_LINK_PREFIX}wishlist/${wishlistId}`;
  return (
    <ShareLinkModal
      visible={visible}
      onClose={onClose}
      title="Share Wishlist"
      message="Anyone with this link can view the wishlist after signing in."
      link={link}
      copiedMessage="Wishlist link copied"
      shareMessage={`Check out my wishlist "${wishlistName}" on Kivan!\n\n${link}\n\nOpen it in the Kivan app to view and add items.`}
      shareTitle={`${wishlistName} - Kivan Wishlist`}
    />
  );
};

export default ShareWishlistModal;
