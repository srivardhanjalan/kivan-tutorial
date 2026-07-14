import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import BorderRadius from '../constants/BorderRadius';
import Shadows from '../constants/Shadows';
import { Spacing } from '../constants/ScreenStyles';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  /** Visual variant (default: 'success') */
  type?: ToastType;
}

interface ToastContextValue {
  /** Show a toast near the bottom of the screen; replaces any visible toast */
  show: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/** How long a toast stays fully visible before auto-dismissing */
const TOAST_DURATION_MS = 2500;
const ANIMATION_IN_MS = 200;
const ANIMATION_OUT_MS = 180;

const TOAST_ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

const TOAST_ICON_COLORS: Record<ToastType, string> = {
  success: Colors.success,
  error: Colors.danger,
  info: Colors.textSecondary,
};

interface ToastState {
  message: string;
  type: ToastType;
}

/**
 * App-wide toast/snackbar provider. Renders a single animated pill above the
 * tab bar area. New toasts replace the current one; each auto-dismisses.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.show('Added to your wishlist!');
 *   toast.show('Could not save changes', { type: 'error' });
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION_OUT_MS,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 12,
        duration: ANIMATION_OUT_MS,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setToast(null);
      }
    });
  }, [opacity, translateY]);

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }

      setToast({ message, type: options?.type ?? 'success' });

      // Restart the entrance animation so replacing a visible toast still
      // reads as a fresh notification.
      opacity.setValue(0);
      translateY.setValue(12);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIMATION_IN_MS,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIMATION_IN_MS,
          useNativeDriver: true,
        }),
      ]).start();

      hideTimeout.current = setTimeout(() => {
        hideTimeout.current = null;
        dismiss();
      }, TOAST_DURATION_MS);
    },
    [opacity, translateY, dismiss]
  );

  const contextValue = useMemo(() => ({ show }), [show]);

  // Sit just above the floating tab bar pill
  const bottomOffset =
    insets.bottom +
    Spacing.tabBarHeight +
    Spacing.tabBarBottomMargin +
    Spacing.md;

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toast && (
        <View
          style={[styles.container, { bottom: bottomOffset }]}
          pointerEvents="none"
        >
          <Animated.View
            style={[styles.pill, { opacity, transform: [{ translateY }] }]}
          >
            <Ionicons
              name={TOAST_ICONS[toast.type]}
              size={20}
              color={TOAST_ICON_COLORS[toast.type]}
              style={styles.icon}
            />
            <Text style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
};

/**
 * Access the app-wide toast. Must be used within ToastProvider.
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.contentHorizontal,
    right: Spacing.contentHorizontal,
    alignItems: 'center',
    zIndex: 1000,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingVertical: 12,
    paddingHorizontal: 20,
    ...Shadows.modal,
  },
  icon: {
    marginRight: 8,
  },
  message: {
    ...Typography.body,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
});

export default ToastProvider;
