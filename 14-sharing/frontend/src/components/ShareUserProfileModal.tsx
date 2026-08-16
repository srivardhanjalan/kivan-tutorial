import React from 'react';
import ShareLinkModal from './ShareLinkModal';
import { DEEP_LINK_PREFIX } from '../utils/deepLinks';

interface ShareUserProfileModalProps {
  visible: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
}

/** Share one profile: composes its `kivan://user/<id>` link and copy, then hands
    off to the shared share surface. */
const ShareUserProfileModal: React.FC<ShareUserProfileModalProps> = ({
  visible,
  userId,
  userName,
  onClose,
}) => {
  const link = `${DEEP_LINK_PREFIX}user/${userId}`;
  return (
    <ShareLinkModal
      visible={visible}
      onClose={onClose}
      title="Share Profile"
      message="Anyone with this link can view the profile after signing in."
      link={link}
      copiedMessage="Profile link copied"
      shareMessage={`Check out ${userName}'s profile on Kivan!\n\n${link}\n\nOpen it in the Kivan app to follow and see their wishlists.`}
      shareTitle={`${userName} - Kivan Profile`}
    />
  );
};

export default ShareUserProfileModal;
