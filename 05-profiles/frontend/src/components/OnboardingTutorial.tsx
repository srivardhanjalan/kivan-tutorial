import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Modal,
  ViewToken,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import BorderRadius from '../constants/BorderRadius';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import GlassPill from './GlassPill';
import Opacity from '../constants/Opacity';
import BrandMark from './BrandMark';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  /** Emoji rendered in the gradient circle; the first step shows the logo */
  emoji?: string;
  /** Pastel wash behind the step's mark — decorative, one per step */
  gradient: [string, string];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: '1',
    title: 'Welcome to Kivan!',
    description: 'Wishlists for life’s moments — birthdays, weddings, festivals — all in one place',
    gradient: ['#E9D5FF', '#DBEAFE'],
  },
  {
    id: '2',
    title: 'Wishes from real stores',
    description: 'Browse storefronts and real store websites inside the app, in your currency',
    emoji: '🛍️',
    gradient: ['#FBCFE8', '#FED7AA'],
  },
  {
    id: '3',
    title: 'Better together',
    description: 'Follow friends, plan events around wishlists, and never miss a moment',
    emoji: '🎉',
    gradient: ['#A7F3D0', '#BAE6FD'],
  },
  {
    id: '4',
    title: 'Ready to begin?',
    description: 'Your account is live — the shelves fill up as the app grows around you',
    emoji: '🚀',
    gradient: ['#DDD6FE', '#FBCFE8'],
  },
];

interface OnboardingTutorialProps {
  visible: boolean;
  /** Fired for both "Get Started" and Skip — the tutorial never re-shows */
  onDismiss: () => void;
}

/**
 * The first-run tutorial: a swipeable full-screen carousel shown once after
 * a user's first sign-in. Completion is persisted on the user's backend
 * record, so reinstalls and new devices don't replay it.
 */
export default function OnboardingTutorial({ visible, onDismiss }: OnboardingTutorialProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Re-run the entrance animation on every step change
  useEffect(() => {
    scaleAnim.setValue(0);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [currentIndex, scaleAnim, fadeAnim]);

  const isLastStep = currentIndex === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onDismiss();
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderStep = ({ item }: { item: OnboardingStep }) => (
    <View style={styles.stepContainer}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: fadeAnim }}>
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[CommonScreenStyles.center, styles.markCircle]}
        >
          {item.emoji ? (
            <Text style={styles.emoji}>{item.emoji}</Text>
          ) : (
            <BrandMark />
          )}
        </LinearGradient>
      </Animated.View>

      <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>{item.title}</Animated.Text>
      <Animated.Text style={[styles.description, { opacity: fadeAnim }]}>
        {item.description}
      </Animated.Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={[CommonScreenStyles.container, styles.container]}>
        {!isLastStep && (
          <TouchableOpacity
            style={[styles.skipButton, { top: insets.top + Spacing.md }]}
            onPress={onDismiss}
            activeOpacity={Opacity.pressed}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        <FlatList
          ref={flatListRef}
          data={ONBOARDING_STEPS}
          renderItem={renderStep}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          bounces={false}
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xxl }]}>
          <View style={styles.dots}>
            {ONBOARDING_STEPS.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === currentIndex && styles.dotActive]}
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={Opacity.pressed}
            // BlurView content is invisible to the accessibility tree — the
            // label must live on the touchable or VoiceOver can't find it
            accessibilityRole="button"
            accessibilityLabel={isLastStep ? 'Get Started' : 'Next'}
          >
            <GlassPill>
              <View style={[CommonScreenStyles.center, styles.nextContent]}>
                <Text style={styles.nextText}>{isLastStep ? 'Get Started' : 'Next'}</Text>
                <Ionicons
                  name={isLastStep ? 'checkmark' : 'arrow-forward'}
                  size={24}
                  color={Colors.primary}
                />
              </View>
            </GlassPill>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  skipButton: {
    position: 'absolute',
    right: Spacing.xl,
    zIndex: 10,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  skipText: {
    ...Typography.bodySecondaryStrong,
    color: Colors.textSecondary,
  },
  stepContainer: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  markCircle: {
    width: 180,
    height: 180,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.xxxl,
  },
  emoji: {
    fontSize: 80,
  },
  title: {
    ...Typography.largeTitle,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGrey,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 36,
  },
  nextContent: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxxl,
  },
  nextText: {
    ...Typography.button,
    color: Colors.primary,
  },
});
