import React from 'react';
import AsyncStatusLine from './AsyncStatusLine';
import useFetch from '../hooks/useFetch';
import { fetchHealth } from '../services/api';

/**
 * The step-03 proof of life: one line showing whether the app can reach the
 * backend. Real screens replace this with real data in later steps.
 */
const ApiStatus: React.FC = () => {
  const { error, loading } = useFetch(fetchHealth);
  return <AsyncStatusLine label="Backend" loading={loading} error={error} value="healthy" />;
};

export default ApiStatus;
