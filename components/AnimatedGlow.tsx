import { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

type AnimatedGlowProps = {
  children: React.ReactNode;
  glowColor: string;
  intensity: number;
  shadowRadius: number;
  enabled?: boolean;
  style?: ViewStyle;
};

export default function AnimatedGlow({
  children,
  glowColor,
  intensity,
  shadowRadius,
  enabled = true,
  style,
}: AnimatedGlowProps) {
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!enabled) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [enabled, glowAnim]);

  if (!enabled) {
    return <>{children}</>;
  }

  const animatedShadowOpacity = glowAnim.interpolate({
    inputRange: [0.6, 1],
    outputRange: [intensity * 0.6, intensity],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: animatedShadowOpacity,
          shadowRadius: shadowRadius,
          elevation: shadowRadius,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
