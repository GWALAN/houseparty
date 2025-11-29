import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';

export type BannerRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type BannerData = {
  colors: string[];
  rarity: BannerRarity;
  glowColor?: string;
};

type BannerRendererProps = {
  colors: string[];
  rarity: BannerRarity;
  glowColor?: string;
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
  kitName?: string;
  disableBorders?: boolean;
};

const NAMED = new Set([
  'black','white','red','green','blue','yellow','orange','purple','pink',
  'cyan','magenta','lime','teal','indigo','violet','brown','gray','silver','gold','maroon'
]);

function toColorString(c: any): string | null {
  if (!c) return null;
  if (typeof c === 'string') {
    const s = c.trim();
    if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) return s;
    if (NAMED.has(s.toLowerCase())) return s;
    return null;
  }
  if (typeof c === 'object') {
    const v = c.hex || c.value || c.color || c.primary || c.code;
    if (typeof v === 'string' && /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return v;
  }
  return null;
}

function normalizeColors(arr: any[]): string[] {
  const out = (arr || []).map(toColorString).filter(Boolean) as string[];
  if (out.length === 1) out.push(out[0]);
  if (out.length === 0) out.push('#334155', '#334155');
  return out;
}

export default function BannerRenderer({ colors, rarity, glowColor, style, size = 'medium', kitName, disableBorders = false }: BannerRendererProps) {
  const gradientColors = normalizeColors(colors);

  const spiralRotate = useRef(new Animated.Value(0)).current;
  const neonWave1 = useRef(new Animated.Value(0)).current;
  const neonWave2 = useRef(new Animated.Value(0)).current;
  const liquidMorph1 = useRef(new Animated.Value(0)).current;
  const liquidMorph2 = useRef(new Animated.Value(0)).current;
  const liquidMorph3 = useRef(new Animated.Value(0)).current;
  const borderColorShift = useRef(new Animated.Value(0)).current;
  const rgbCycle = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const particle1Anim = useRef(new Animated.Value(0)).current;
  const particle2Anim = useRef(new Animated.Value(0)).current;
  const particle3Anim = useRef(new Animated.Value(0)).current;
  const auroraAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (kitName === 'Celestial Crown') {
      Animated.loop(
        Animated.timing(rgbCycle, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: false,
        })
      ).start();
    } else if (kitName === 'Eternal Nexus') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: false,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 10000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else if (kitName === 'Celestial Dreams') {
      Animated.stagger(500, [
        Animated.loop(
          Animated.timing(particle1Anim, {
            toValue: 1,
            duration: 20000,
            useNativeDriver: false,
          })
        ),
        Animated.loop(
          Animated.timing(particle2Anim, {
            toValue: 1,
            duration: 20000,
            useNativeDriver: false,
          })
        ),
        Animated.loop(
          Animated.timing(particle3Anim, {
            toValue: 1,
            duration: 20000,
            useNativeDriver: false,
          })
        ),
      ]).start();
    } else if (kitName === 'Phantom Obsidian') {
      Animated.loop(
        Animated.timing(neonWave1, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: false,
        })
      ).start();

      Animated.loop(
        Animated.timing(neonWave2, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: false,
        })
      ).start();
    } else if (kitName === 'Eternal Radiance') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(liquidMorph1, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: false,
          }),
          Animated.timing(liquidMorph1, {
            toValue: 0,
            duration: 10000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(liquidMorph2, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: false,
          }),
          Animated.timing(liquidMorph2, {
            toValue: 0,
            duration: 10000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(liquidMorph3, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: false,
          }),
          Animated.timing(liquidMorph3, {
            toValue: 0,
            duration: 10000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(borderColorShift, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: false,
        })
      ).start();
    } else if (rarity === 'legendary') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: false,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 10000,
            useNativeDriver: false,
          }),
        ])
      ).start();


      Animated.stagger(800, [
        Animated.loop(
          Animated.timing(particle1Anim, {
            toValue: 1,
            duration: 20000,
            useNativeDriver: false,
          })
        ),
        Animated.loop(
          Animated.timing(particle2Anim, {
            toValue: 1,
            duration: 20000,
            useNativeDriver: false,
          })
        ),
        Animated.loop(
          Animated.timing(particle3Anim, {
            toValue: 1,
            duration: 20000,
            useNativeDriver: false,
          })
        ),
      ]).start();
    } else if (rarity === 'mythic') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: false,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 10000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(auroraAnim, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: false,
          }),
          Animated.timing(auroraAnim, {
            toValue: 0,
            duration: 10000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      Animated.stagger(600, [
        Animated.loop(
          Animated.timing(particle1Anim, {
            toValue: 1,
            duration: 20000,
            useNativeDriver: false,
          })
        ),
        Animated.loop(
          Animated.timing(particle2Anim, {
            toValue: 1,
            duration: 20000,
            useNativeDriver: false,
          })
        ),
        Animated.loop(
          Animated.timing(particle3Anim, {
            toValue: 1,
            duration: 20000,
            useNativeDriver: false,
          })
        ),
      ]).start();
    }
  }, [rarity, kitName]);

  const sizeStyles = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  if (kitName === 'Celestial Dreams') {
    if (disableBorders) {
      return (
        <View style={[sizeStyles[size], style]}>
          <View style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={gradientColors as [string, string, ...string[]]}
              start={[0, 0]}
              end={[1, 1]}
              style={styles.gradient}
            />
          </View>

          {[particle1Anim, particle2Anim, particle3Anim].map((anim, index) => {
            const opacity = anim.interpolate({
              inputRange: [0, 0.3, 0.7, 1],
              outputRange: [0, 1, 1, 0],
            });
            const scale = anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 1.5, 0],
            });
            const rotate = anim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', `${(index + 1) * 120}deg`],
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.spiralParticle,
                  {
                    opacity,
                    transform: [
                      { rotate },
                      { translateX: 40 + index * 10 },
                      { scale },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>
      );
    }

    return (
      <View style={[sizeStyles[size], styles.celestialContainer, style]}>
        <View style={styles.celestialOuterBorder}>
          <View style={styles.celestialInnerBorder}>
            <View style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={gradientColors as [string, string, ...string[]]}
                start={[0, 0]}
                end={[1, 1]}
                style={styles.gradient}
              />
            </View>

            {[particle1Anim, particle2Anim, particle3Anim].map((anim, index) => {
              const opacity = anim.interpolate({
                inputRange: [0, 0.3, 0.7, 1],
                outputRange: [0, 1, 1, 0],
              });
              const scale = anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 1.5, 0],
              });
              const rotate = anim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', `${(index + 1) * 120}deg`],
              });

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.spiralParticle,
                    {
                      opacity,
                      transform: [
                        { rotate },
                        { translateX: 40 + index * 10 },
                        { scale },
                      ],
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  if (kitName === 'Phantom Obsidian') {
    const wave1TranslateX = neonWave1.interpolate({
      inputRange: [0, 1],
      outputRange: [-400, 400],
    });
    const wave2TranslateX = neonWave2.interpolate({
      inputRange: [0, 1],
      outputRange: [400, -400],
    });

    if (disableBorders) {
      return (
        <View style={[sizeStyles[size], style]}>
          <LinearGradient
            colors={gradientColors as [string, string, ...string[]]}
            start={[0, 0]}
            end={[1, 0]}
            style={styles.gradient}
          />

          <Animated.View
            style={[
              styles.neonWave,
              { transform: [{ translateX: wave1TranslateX }, { skewX: '15deg' }] }
            ]}
          >
            <LinearGradient
              colors={[
                'transparent',
                'rgba(255, 0, 255, 0.4)',
                'rgba(0, 255, 255, 0.6)',
                'rgba(57, 255, 20, 0.4)',
                'transparent',
              ]}
              start={[0, 0]}
              end={[1, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.neonWave,
              { transform: [{ translateX: wave2TranslateX }, { skewX: '-15deg' }] }
            ]}
          >
            <LinearGradient
              colors={[
                'transparent',
                'rgba(57, 255, 20, 0.4)',
                'rgba(255, 255, 0, 0.6)',
                'rgba(255, 16, 240, 0.4)',
                'transparent',
              ]}
              start={[0, 0]}
              end={[1, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      );
    }

    return (
      <View style={[sizeStyles[size], styles.phantomContainer, style]}>
        <View style={styles.phantomOuterBorder}>
          <View style={styles.phantomInnerBorder}>
            <LinearGradient
              colors={gradientColors as [string, string, ...string[]]}
              start={[0, 0]}
              end={[1, 0]}
              style={styles.gradient}
            />

            <Animated.View
              style={[
                styles.neonWave,
                { transform: [{ translateX: wave1TranslateX }, { skewX: '15deg' }] }
              ]}
            >
              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(255, 0, 255, 0.4)',
                  'rgba(0, 255, 255, 0.6)',
                  'rgba(57, 255, 20, 0.4)',
                  'transparent',
                ]}
                start={[0, 0]}
                end={[1, 1]}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.neonWave,
                { transform: [{ translateX: wave2TranslateX }, { skewX: '-15deg' }] }
              ]}
            >
              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(57, 255, 20, 0.4)',
                  'rgba(255, 255, 0, 0.6)',
                  'rgba(255, 16, 240, 0.4)',
                  'transparent',
                ]}
                start={[0, 1]}
                end={[1, 0]}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </View>
      </View>
    );
  }

  if (kitName === 'Eternal Radiance') {
    const borderColor = borderColorShift.interpolate({
      inputRange: [0, 0.33, 0.66, 1],
      outputRange: ['#FFFFFF', '#C0C0C0', '#E0E0E0', '#FFFFFF'],
    });

    // Ensure we have enough colors for slicing
    const safeColors = [...gradientColors];
    while (safeColors.length < 12) {
      safeColors.push(safeColors[safeColors.length - 1] || '#334155');
    }

    return (
      <View style={[sizeStyles[size], styles.eternalContainer, style]}>
        <View style={styles.eternalOuterBorder}>
          <Animated.View style={[styles.eternalInnerBorder, { borderColor }]}>
            <View style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={safeColors.slice(0, 4) as [string, string, ...string[]]}
                start={[0, 0]}
                end={[1, 1]}
                style={[styles.gradient, { opacity: 0.7 }]}
              />
            </View>

            <View style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={safeColors.slice(4, 8) as [string, string, ...string[]]}
                start={[1, 1]}
                end={[0, 0]}
                style={[styles.gradient, { opacity: 0.5 }]}
              />
            </View>

            <View style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={safeColors.slice(8, 12) as [string, string, ...string[]]}
                start={[0.5, 0]}
                end={[0, 1]}
                style={[styles.gradient, { opacity: 0.6 }]}
              />
            </View>

            <View style={styles.metallicOverlay}>
              <LinearGradient
                colors={[
                  'rgba(255, 255, 255, 0.7)',
                  'rgba(232, 232, 232, 0.5)',
                  'rgba(192, 192, 192, 0.5)',
                  'rgba(255, 255, 255, 0.8)',
                ]}
                start={[0, 0]}
                end={[1, 1]}
                style={StyleSheet.absoluteFill}
              />
            </View>

            <View style={styles.chromaticOverlay}>
              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(255, 255, 255, 0.4)',
                  'rgba(192, 192, 192, 0.3)',
                  'rgba(255, 255, 255, 0.5)',
                  'transparent',
                ]}
                start={[0, 0]}
                end={[1, 1]}
                style={StyleSheet.absoluteFill}
              />
            </View>

            <Animated.View
              style={[
                styles.goldSparkleOverlay,
                { opacity: shimmerAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.15, 0.35, 0.15],
                }) }
              ]}
            >
              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(255, 215, 0, 0.2)',
                  'transparent',
                  'rgba(255, 215, 0, 0.15)',
                  'transparent',
                  'rgba(255, 215, 0, 0.25)',
                  'transparent',
                ]}
                start={[0, 0]}
                end={[1, 1]}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    );
  }

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const auroraOpacity = auroraAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  const containerScale = rarity === 'mythic' ? 1.1 : 1;

  if (kitName === 'Celestial Crown') {
    const rgbBorderColor = rgbCycle.interpolate({
      inputRange: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1],
      outputRange: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF', '#FF0000'],
    });

    return (
      <View style={[sizeStyles[size], styles.rgbContainer, style]}>
        <Animated.View style={[styles.rgbOuterBorder, { borderColor: rgbBorderColor, shadowColor: rgbBorderColor }]}>
          <Animated.View style={[styles.rgbInnerBorder, { borderColor: rgbBorderColor }]}>
            <View style={[styles.gradient, { backgroundColor: '#000000' }]} />
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  if (kitName === 'Eternal Nexus') {
    const shimmerTranslate = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-600, 600],
    });

    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 0],
    });

    if (disableBorders) {
      return (
        <View style={[sizeStyles[size], style]}>
          <View style={[styles.gradient, { backgroundColor: '#000000' }]} />

          <Animated.View
            style={[
              styles.intenseGoldShimmer,
              {
                transform: [{ translateX: shimmerTranslate }],
                opacity: shimmerOpacity
              }
            ]}
          >
            <LinearGradient
              colors={[
                'transparent',
                'rgba(255, 215, 0, 0.2)',
                'rgba(255, 215, 0, 0.6)',
                'rgba(255, 215, 0, 1)',
                'rgba(255, 215, 0, 0.6)',
                'rgba(255, 215, 0, 0.2)',
                'transparent',
              ]}
              start={[0, 0]}
              end={[1, 0]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      );
    }

    return (
      <View style={[sizeStyles[size], styles.blackGoldContainer, style]}>
        <View style={styles.blackGoldBorder}>
          <View style={[styles.gradient, { backgroundColor: '#000000' }]} />

          <Animated.View
            style={[
              styles.intenseGoldShimmer,
              {
                transform: [{ translateX: shimmerTranslate }],
                opacity: shimmerOpacity
              }
            ]}
          >
            <LinearGradient
              colors={[
                'transparent',
                'rgba(255, 215, 0, 0.2)',
                'rgba(255, 215, 0, 0.6)',
                'rgba(255, 215, 0, 1)',
                'rgba(255, 215, 0, 0.6)',
                'rgba(255, 215, 0, 0.2)',
                'transparent',
              ]}
              start={[0, 0]}
              end={[1, 0]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </View>
    );
  }

  if (rarity === 'legendary') {
    return (
      <View
        style={[
          sizeStyles[size],
          styles.legendaryContainer,
          style,
        ]}
      >
        <View style={styles.legendaryOuterBorder}>
          <View style={styles.legendaryInnerBorder}>
            <LinearGradient
              colors={gradientColors as [string, string, ...string[]]}
              start={[0, 0]}
              end={[1, 0]}
              style={styles.gradient}
            />

            <Animated.View
              style={[
                styles.shimmerOverlay,
                { transform: [{ translateX: shimmerTranslate }] }
              ]}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255, 215, 0, 0.6)', 'transparent']}
                start={[0, 0]}
                end={[1, 0]}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            {[particle1Anim, particle2Anim, particle3Anim].map((anim, index) => {
              const opacity = anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 1, 0],
              });
              const translateY = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, -40],
              });
              const translateX = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [index * 30, index * 30 + 20],
              });

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.particle,
                    {
                      opacity,
                      transform: [
                        { translateX },
                        { translateY },
                      ],
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  if (rarity === 'mythic') {
    return (
      <View
        style={[
          sizeStyles[size],
          styles.mythicContainer,
          style,
        ]}
      >
        <View style={styles.mythicOuterBorder}>
          <View style={styles.mythicInnerBorder}>
            <LinearGradient
              colors={gradientColors as [string, string, ...string[]]}
              start={[0, 0]}
              end={[1, 0]}
              style={styles.gradient}
            />

            <Animated.View
              style={[
                styles.auroraOverlay,
                { opacity: auroraOpacity }
              ]}
            >
              <LinearGradient
                colors={[
                  'rgba(139, 92, 246, 0.4)',
                  'rgba(236, 72, 153, 0.4)',
                  'rgba(59, 130, 246, 0.4)',
                  'rgba(139, 92, 246, 0.4)',
                ]}
                start={[0, 0]}
                end={[1, 1]}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            <View style={styles.holographicOverlay}>
              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(255, 255, 255, 0.3)',
                  'rgba(139, 92, 246, 0.3)',
                  'rgba(236, 72, 153, 0.3)',
                  'rgba(59, 130, 246, 0.3)',
                  'transparent',
                ]}
                start={[0, 0]}
                end={[1, 1]}
                style={StyleSheet.absoluteFill}
              />
            </View>

            {[particle1Anim, particle2Anim, particle3Anim].map((anim, index) => {
              const opacity = anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 1, 0],
              });
              const translateY = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, -50],
              });
              const translateX = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [index * 40, index * 40 + 30],
              });
              const scale = anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.5, 1.5, 0.5],
              });

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.cosmicParticle,
                    {
                      opacity,
                      transform: [
                        { translateX },
                        { translateY },
                        { scale },
                      ],
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  if (rarity === 'common') {
    const solidColor = gradientColors[0] || '#64748B';
    return (
      <View style={[sizeStyles[size], style, { backgroundColor: solidColor }]} />
    );
  }

  return (
    <View style={[sizeStyles[size], style]}>
      <LinearGradient
        colors={gradientColors as [string, string, ...string[]]}
        start={[0, 0]}
        end={[1, 0]}
        style={styles.gradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  small: {
    width: 60,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#334155',
  },
  medium: {
    width: 120,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#334155',
  },
  large: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 0,
  },
  celestialContainer: {
    borderWidth: 0,
  },
  celestialOuterBorder: {
    flex: 1,
    borderRadius: 16,
    padding: 3,
    backgroundColor: '#8B00FF',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  celestialInnerBorder: {
    flex: 1,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: '#FFD700',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  spiralParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
    top: '50%',
    left: '50%',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  phantomContainer: {
    borderWidth: 0,
  },
  phantomOuterBorder: {
    flex: 1,
    borderRadius: 16,
    padding: 3,
    backgroundColor: '#000000',
    shadowColor: '#FF00FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 25,
  },
  phantomInnerBorder: {
    flex: 1,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: '#00FFFF',
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  neonWave: {
    position: 'absolute',
    top: -50,
    left: -200,
    right: -200,
    bottom: -50,
    width: 800,
  },
  eternalContainer: {
    borderWidth: 0,
  },
  eternalOuterBorder: {
    flex: 1,
    borderRadius: 16,
    padding: 4,
    backgroundColor: '#C0C0C0',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 30,
  },
  eternalInnerBorder: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 6,
    overflow: 'hidden',
    backgroundColor: '#606060',
  },
  metallicOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chromaticOverlay: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
  },
  goldSparkleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  legendaryContainer: {
    borderWidth: 0,
  },
  legendaryOuterBorder: {
    flex: 1,
    borderRadius: 16,
    padding: 3,
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  legendaryInnerBorder: {
    flex: 1,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FBBF24',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  mythicContainer: {
    borderWidth: 0,
    overflow: 'visible',
  },
  mythicOuterBorder: {
    flex: 1,
    borderRadius: 16,
    padding: 3,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  mythicInnerBorder: {
    flex: 1,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
  },
  auroraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  holographicOverlay: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFD700',
    bottom: 10,
    left: 20,
  },
  cosmicParticle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    bottom: 15,
    left: 30,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  rgbContainer: {
    overflow: 'visible',
  },
  rgbOuterBorder: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 4,
    padding: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  rgbInnerBorder: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 4,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  rgbShimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: -300,
    right: 0,
    bottom: 0,
    width: 700,
  },
  blackGoldContainer: {
    overflow: 'visible',
  },
  blackGoldBorder: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  intenseGoldShimmer: {
    position: 'absolute',
    top: 0,
    left: -500,
    right: 0,
    bottom: 0,
    width: 1000,
  },
});
