import React from 'react';
import { Text, StyleSheet } from 'react-native';
import FormInput from './FormInput';
import UserRow from './UserRow';
import type { User } from '../services/api';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

interface UserSearchPickerProps {
  query: string;
  onChangeQuery: (query: string) => void;
  /** The debounced search results the caller's useUserSearch already filtered. */
  results: User[];
  onPick: (user: User) => void;
  /** Disables the box while a pick is in flight (the co-owner add does this). */
  editable?: boolean;
}

/**
 * Search people by name and tap one: the box plus its results, shared by the
 * invite-guest and add-co-owner modals so both read as the same Discover-style
 * lookup. The caller owns the useUserSearch hook (and thus its filter and reset),
 * and just hands the query/results through.
 */
const UserSearchPicker: React.FC<UserSearchPickerProps> = ({
  query,
  onChangeQuery,
  results,
  onPick,
  editable,
}) => (
  <>
    <FormInput
      value={query}
      onChangeText={onChangeQuery}
      placeholder="Search people by name"
      autoCapitalize="none"
      autoCorrect={false}
      clearButtonMode="while-editing"
      editable={editable}
    />
    {query.trim().length > 0 &&
      (results.length === 0 ? (
        <Text style={styles.hint}>No one to add.</Text>
      ) : (
        results.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            subtitle={user.email}
            onPress={() => onPick(user)}
          />
        ))
      ))}
  </>
);

const styles = StyleSheet.create({
  hint: {
    ...Typography.bodySecondary,
    paddingVertical: Spacing.sm,
  },
});

export default UserSearchPicker;
