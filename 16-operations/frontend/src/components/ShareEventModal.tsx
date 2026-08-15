import React from 'react';
import ShareLinkModal from './ShareLinkModal';
import { DEEP_LINK_PREFIX } from '../utils/deepLinks';

interface ShareEventModalProps {
  visible: boolean;
  eventId: string;
  eventName: string;
  onClose: () => void;
}

/** Share one event: composes its `kivan://event/<id>` link and copy, then hands
    off to the shared share surface. */
const ShareEventModal: React.FC<ShareEventModalProps> = ({
  visible,
  eventId,
  eventName,
  onClose,
}) => {
  const link = `${DEEP_LINK_PREFIX}event/${eventId}`;
  return (
    <ShareLinkModal
      visible={visible}
      onClose={onClose}
      title="Share Event"
      message="Anyone with this link can view the event and RSVP after signing in."
      link={link}
      copiedMessage="Event link copied"
      shareMessage={`Join me at "${eventName}" on Kivan!\n\n${link}\n\nOpen it in the Kivan app to RSVP and see the details.`}
      shareTitle={`${eventName} - Kivan Event`}
    />
  );
};

export default ShareEventModal;
