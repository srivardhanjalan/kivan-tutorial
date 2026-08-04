/**
 * Muted pastel tile backgrounds for wishlist art blocks, keyed by
 * life-event id. Part of the tonal, image-led, borderless design language —
 * each wishlist tile gets a soft wash derived from its life event.
 */
const LIFE_EVENT_PASTELS: Record<string, string> = {
  birthday: '#FFE8EC',
  wedding: '#EFEAFB',
  'baby-shower': '#FDEBF3',
  graduation: '#E7F1F8',
  housewarming: '#E8F4EA',
  anniversary: '#FDEBF3',
  retirement: '#FFF4E0',
  holiday: '#EFEAFB',
  general: '#FFF4E0',
};

/** Neutral wash for a life event with no pastel of its own (an unknown id). */
const FALLBACK_PASTEL = '#F6F6F7';

/** Resolve the tile pastel for a life-event id (neutral when unknown). */
function pastelForLifeEvent(id: string): string {
  return LIFE_EVENT_PASTELS[id] ?? FALLBACK_PASTEL;
}

export default pastelForLifeEvent;
