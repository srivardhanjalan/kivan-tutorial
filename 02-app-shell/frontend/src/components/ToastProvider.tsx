import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Shadows from '../constants/Shadows';
import { Spacing } from '../constants/ScreenStyles';

interface ToastContextValue {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

/**
 * Bottom toasts: one dark pill that fades/slides in above the tab bar and
 * dismisses itself. Screens call useToast().show('...').
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (msg: string) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setMessage(msg);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(
          () => setMessage(null)
        );
      }, 2200);
    },
    [opacity]
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message !== null && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { opacity, bottom: insets.bottom + Spacing.scrollContentBottom },
          ]}
        >
          <Text style={styles.text}>{message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.toastSurface,
    borderRadius: BorderRadius.full,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    ...Shadows.modal,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
  },
});
