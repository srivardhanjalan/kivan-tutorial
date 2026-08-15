import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../components/Navigation';

/**
 * The app's stack param list is typed ONCE, right here. Screens import intent
 * — "give me navigation", "give me my route" — instead of respelling the
 * `NativeStackNavigationProp<RootStackParamList>` / `RouteProp<...>` generics
 * incantation in every file.
 *
 * Cycle note: `RootStackParamList` lives in components/Navigation.tsx, which
 * imports the very screens that call these hooks. Pulling it in with
 * `import type` keeps that a type-only reference — erased at runtime, so no
 * require cycle exists to break.
 */

/** The app's typed navigation object — push/navigate/goBack, param-checked. */
export function useAppNavigation() {
  return useNavigation<NativeStackNavigationProp<RootStackParamList>>();
}

/**
 * The typed route for a screen name, so `useAppRoute<'WishDetail'>().params`
 * infers as `{ wishId: string }` — the param types flow from the one param
 * list above, not from a per-screen `RouteProp` annotation.
 */
export function useAppRoute<Name extends keyof RootStackParamList>() {
  return useRoute<RouteProp<RootStackParamList, Name>>();
}
