import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, Users, Trophy, Sparkles } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

type OnboardingStep = {
  icon: any;
  title: string;
  description: string;
  color: string;
};

const STEPS: OnboardingStep[] = [
  {
    icon: Home,
    title: 'Welcome to HouseParty',
    description: 'Create houses for different games and activities. Track scores, compete with friends, and build your legacy.',
    color: '#10B981',
  },
  {
    icon: Users,
    title: 'Invite Your Friends',
    description: 'Share QR codes or invite links to bring friends into your houses. The more players, the more fun!',
    color: '#3B82F6',
  },
  {
    icon: Trophy,
    title: 'Track Everything',
    description: 'From board games to sports, track any activity with custom scoring. See who\'s leading on the leaderboard.',
    color: '#F59E0B',
  },
  {
    icon: Sparkles,
    title: 'Unlock Rewards',
    description: 'Earn badges, unlock custom themes and banners. Make your houses uniquely yours!',
    color: '#8B5CF6',
  },
];

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

function AnimatedIcon({ Icon, color }: { Icon: any; color: string }) {
  const bounceAnimation = useSharedValue(0);
  const rotateAnimation = useSharedValue(0);

  useEffect(() => {
    bounceAnimation.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    rotateAnimation.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounceAnimation.value },
      { rotate: `${rotateAnimation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedLinearGradient
        colors={[color, color + 'CC']}
        style={styles.iconGradient}
        entering={FadeIn.duration(600).delay(200)}
      >
        <Icon size={64} color="#FFFFFF" strokeWidth={2} />
      </AnimatedLinearGradient>
    </Animated.View>
  );
}

function PulsingButton({
  onPress,
  disabled,
  color,
  text
}: {
  onPress: () => void;
  disabled: boolean;
  color: string;
  text: string;
}) {
  const pulseAnimation = useSharedValue(1);

  useEffect(() => {
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: disabled ? 1 : pulseAnimation.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.nextButton, disabled && styles.nextButtonDisabled]}
    >
      <Animated.View style={animatedStyle}>
        <LinearGradient
          colors={[color, color + 'CC']}
          style={styles.nextGradient}
        >
          <Text style={styles.nextText}>{text}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

function AnimatedDot({
  isActive,
  color,
  index
}: {
  isActive: boolean;
  color: string;
  index: number;
}) {
  const scaleAnimation = useSharedValue(isActive ? 1 : 0.8);

  useEffect(() => {
    scaleAnimation.value = withSpring(isActive ? 1 : 0.8, {
      damping: 10,
      stiffness: 100,
    });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnimation.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.delay(index * 100)}
      style={[
        styles.dot,
        isActive && styles.activeDot,
        { backgroundColor: isActive ? color : '#475569' },
        animatedStyle,
      ]}
    />
  );
}

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const slideAnimation = useSharedValue(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      slideAnimation.value = withTiming(1, { duration: 300 }, () => {
        slideAnimation.value = 0;
      });
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_profile_settings')
        .update({ has_completed_onboarding: true })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating onboarding status:', error);
      }

      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={styles.gradient}
      >
        <Animated.View
          key={currentStep}
          entering={SlideInRight.duration(400)}
          exiting={SlideOutLeft.duration(400)}
          style={styles.content}
        >
          <View style={styles.iconContainer}>
            <AnimatedIcon Icon={Icon} color={step.color} />
          </View>

          <Animated.Text
            entering={FadeIn.duration(600).delay(300)}
            style={styles.title}
          >
            {step.title}
          </Animated.Text>

          <Animated.Text
            entering={FadeIn.duration(600).delay(400)}
            style={styles.description}
          >
            {step.description}
          </Animated.Text>

          <View style={styles.dotsContainer}>
            {STEPS.map((_, index) => (
              <AnimatedDot
                key={index}
                isActive={index === currentStep}
                color={step.color}
                index={index}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeIn.duration(600).delay(600)}
          style={styles.footer}
        >
          {!isLastStep && (
            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}

          <PulsingButton
            onPress={handleNext}
            disabled={loading}
            color={step.color}
            text={isLastStep ? 'Get Started' : 'Next'}
          />
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: typeof Platform !== 'undefined' && Platform.OS === 'android' ? 100 : 40,
  },
  iconContainer: {
    marginBottom: 48,
  },
  iconGradient: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 18,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 27,
    maxWidth: 340,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 48,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
  },
  footer: {
    padding: 24,
    gap: 12,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
