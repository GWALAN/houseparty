import { Pressable, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';

type LongPressButtonProps = {
  onPress: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
  delayBeforeRepeat?: number;
  accelerationFactor?: number;
};

/**
 * Button component that supports long-press with accelerating repeat
 *
 * - Single tap: Triggers onPress once
 * - Hold down: Triggers onPress repeatedly with acceleration
 * - The longer you hold, the faster it increments
 *
 * @param onPress - Function to call on each increment
 * @param delayBeforeRepeat - Initial delay before repeating starts (default: 300ms)
 * @param accelerationFactor - How quickly to accelerate (default: 0.9 = 10% faster each cycle)
 */
export function LongPressButton({
  onPress,
  onLongPress,
  children,
  style,
  disabled = false,
  delayBeforeRepeat = 300,
  accelerationFactor = 0.9,
}: LongPressButtonProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentIntervalTime = useRef<number>(100);
  const pressCount = useRef<number>(0);
  const lastHapticTime = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startRepeating = useCallback(() => {
    // Initial interval time (slower start for better UI responsiveness)
    currentIntervalTime.current = 150;
    pressCount.current = 0;

    const repeat = () => {
      onPress();
      pressCount.current += 1;

      // Provide haptic feedback ONLY every 15 increments with time-based debounce
      const now = Date.now();
      if (Platform.OS !== 'web' && pressCount.current % 15 === 0 && now - lastHapticTime.current > 200) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        lastHapticTime.current = now;
      }

      // Accelerate after every 3 increments for smoother progression
      if (pressCount.current % 3 === 0) {
        clearTimers();

        // Calculate new interval time with acceleration
        currentIntervalTime.current = Math.max(
          50, // Minimum interval (20 increments per second max for UI responsiveness)
          currentIntervalTime.current * accelerationFactor
        );

        // Set up new interval with faster speed
        intervalRef.current = setInterval(repeat, currentIntervalTime.current);
      }
    };

    // Start the interval
    intervalRef.current = setInterval(repeat, currentIntervalTime.current);
  }, [onPress, clearTimers, accelerationFactor]);

  const handlePressIn = useCallback(() => {
    if (disabled) return;

    // Immediate first press
    onPress();

    // Light haptic on initial press with debounce
    const now = Date.now();
    if (Platform.OS !== 'web' && now - lastHapticTime.current > 100) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastHapticTime.current = now;
    }

    // Start repeating after delay
    timeoutRef.current = setTimeout(() => {
      if (onLongPress) onLongPress();
      startRepeating();
    }, delayBeforeRepeat);
  }, [disabled, onPress, onLongPress, startRepeating, delayBeforeRepeat]);

  const handlePressOut = useCallback(() => {
    clearTimers();
    pressCount.current = 0;
  }, [clearTimers]);

  return (
    <Pressable
      style={style}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      {children}
    </Pressable>
  );
}
