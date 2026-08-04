import useFetch from './useFetch';
import { fetchLifeEvents } from '../services/api';

/**
 * The app's one spelling of "fetch the life-event taxonomy": the fetched
 * list, whether it's still loading, and a resolver that maps a wishlist's
 * life_event_id back to its event. Every surface that tags or shows a life
 * event (the selector, the cards, the detail hero) reads it from here.
 */
export default function useLifeEvents() {
  const { data: lifeEvents, loading } = useFetch(fetchLifeEvents);
  const lifeEventFor = (id: string) => lifeEvents?.find((event) => event.id === id);
  return { lifeEvents, lifeEventFor, loading };
}
