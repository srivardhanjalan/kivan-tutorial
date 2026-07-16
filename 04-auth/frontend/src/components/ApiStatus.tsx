import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';
import { fetchHealth } from '../services/api';

type State = 'checking' | 'healthy' | 'unreachable';

/**
 * The step's proof of life: one line showing whether the app can reach the
 * backend. Real screens replace this with real data in later steps.
 */
const ApiStatus: React.FC = () => {
  const [state, setState] = useState<State>('checking');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchHealth()
      .then(() => mounted && setState('healthy'))
      .catch((e: Error) => {
        if (mounted) {
          setDetail(e.message);
          setState('unreachable');
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const label: Record<State, string> = {
    checking: 'checking…',
    healthy: 'healthy',
    unreachable: `unreachable — ${detail}`,
  };
  const stateStyle: Record<State, object | undefined> = {
    checking: undefined,
    healthy: styles.healthy,
    unreachable: styles.unreachable,
  };

  return <Text style={[styles.text, stateStyle[state]]}>Backend · {label[state]}</Text>;
};

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  healthy: {
    color: Colors.success,
  },
  unreachable: {
    color: Colors.danger,
  },
});

export default ApiStatus;
