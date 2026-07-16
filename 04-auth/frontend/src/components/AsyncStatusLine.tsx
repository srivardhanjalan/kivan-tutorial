import React from 'react';
import StatusLine from './StatusLine';

/**
 * A StatusLine reporting a useFetchOnMount result: checking while in
 * flight, the error when it failed, the caller's value once resolved.
 */
const AsyncStatusLine: React.FC<{
  label: string;
  loading: boolean;
  error: string;
  /** What to show on success */
  value: string;
}> = ({ label, loading, error, value }) => (
  <StatusLine
    label={label}
    value={loading ? 'checking…' : error ? `error — ${error}` : value}
    tone={loading ? 'neutral' : error ? 'bad' : 'good'}
  />
);

export default AsyncStatusLine;
