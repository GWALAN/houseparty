import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';

type MythicBorderProps = {
  children: React.ReactNode;
  size?: number;
};

export default function MythicBorder({ children, size = 100 }: MythicBorderProps) {
  const cornerSize = size * 0.25;
  const decorativeScale = size / 100;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {children}

      <View style={styles.cornerTopLeft}>
        <Svg width={cornerSize} height={cornerSize} viewBox="0 0 50 50">
          <Defs>
            <RadialGradient id="goldGradient" cx="50%" cy="50%">
              <Stop offset="0%" stopColor="#FCD34D" stopOpacity="1" />
              <Stop offset="50%" stopColor="#F59E0B" stopOpacity="1" />
              <Stop offset="100%" stopColor="#D97706" stopOpacity="0.9" />
            </RadialGradient>
          </Defs>

          <Path
            d="M 2 48 Q 2 35 2 25 Q 2 15 5 10 Q 8 5 12 3 L 18 2 Q 25 2 35 2 Q 40 2 42 5 L 35 8 Q 28 10 22 12 Q 15 15 10 20 Q 6 25 4 32 Q 3 38 2 45 Z"
            fill="url(#goldGradient)"
            stroke="#FBBF24"
            strokeWidth="0.5"
          />

          <Path
            d="M 8 8 L 15 6 Q 18 8 15 12 L 12 15 Q 10 12 8 8 Z"
            fill="#FCD34D"
            opacity="0.8"
          />

          <Path
            d="M 5 20 Q 8 18 12 20 L 10 25 Q 7 23 5 20 Z"
            fill="#FBBF24"
            opacity="0.7"
          />

          <Path
            d="M 20 5 Q 22 8 20 12 L 25 10 Q 23 7 20 5 Z"
            fill="#F59E0B"
            opacity="0.8"
          />
        </Svg>
      </View>

      <View style={styles.cornerTopRight}>
        <Svg width={cornerSize} height={cornerSize} viewBox="0 0 50 50">
          <Defs>
            <RadialGradient id="goldGradient2" cx="50%" cy="50%">
              <Stop offset="0%" stopColor="#FCD34D" stopOpacity="1" />
              <Stop offset="50%" stopColor="#F59E0B" stopOpacity="1" />
              <Stop offset="100%" stopColor="#D97706" stopOpacity="0.9" />
            </RadialGradient>
          </Defs>

          <Path
            d="M 48 48 Q 48 35 48 25 Q 48 15 45 10 Q 42 5 38 3 L 32 2 Q 25 2 15 2 Q 10 2 8 5 L 15 8 Q 22 10 28 12 Q 35 15 40 20 Q 44 25 46 32 Q 47 38 48 45 Z"
            fill="url(#goldGradient2)"
            stroke="#FBBF24"
            strokeWidth="0.5"
          />

          <Path
            d="M 42 8 L 35 6 Q 32 8 35 12 L 38 15 Q 40 12 42 8 Z"
            fill="#FCD34D"
            opacity="0.8"
          />

          <Path
            d="M 45 20 Q 42 18 38 20 L 40 25 Q 43 23 45 20 Z"
            fill="#FBBF24"
            opacity="0.7"
          />

          <Path
            d="M 30 5 Q 28 8 30 12 L 25 10 Q 27 7 30 5 Z"
            fill="#F59E0B"
            opacity="0.8"
          />
        </Svg>
      </View>

      <View style={styles.cornerBottomLeft}>
        <Svg width={cornerSize} height={cornerSize} viewBox="0 0 50 50">
          <Defs>
            <RadialGradient id="goldGradient3" cx="50%" cy="50%">
              <Stop offset="0%" stopColor="#FCD34D" stopOpacity="1" />
              <Stop offset="50%" stopColor="#F59E0B" stopOpacity="1" />
              <Stop offset="100%" stopColor="#D97706" stopOpacity="0.9" />
            </RadialGradient>
          </Defs>

          <Path
            d="M 2 2 Q 2 15 2 25 Q 2 35 5 40 Q 8 45 12 47 L 18 48 Q 25 48 35 48 Q 40 48 42 45 L 35 42 Q 28 40 22 38 Q 15 35 10 30 Q 6 25 4 18 Q 3 12 2 5 Z"
            fill="url(#goldGradient3)"
            stroke="#FBBF24"
            strokeWidth="0.5"
          />

          <Path
            d="M 8 42 L 15 44 Q 18 42 15 38 L 12 35 Q 10 38 8 42 Z"
            fill="#FCD34D"
            opacity="0.8"
          />

          <Path
            d="M 5 30 Q 8 32 12 30 L 10 25 Q 7 27 5 30 Z"
            fill="#FBBF24"
            opacity="0.7"
          />

          <Path
            d="M 20 45 Q 22 42 20 38 L 25 40 Q 23 43 20 45 Z"
            fill="#F59E0B"
            opacity="0.8"
          />
        </Svg>
      </View>

      <View style={styles.cornerBottomRight}>
        <Svg width={cornerSize} height={cornerSize} viewBox="0 0 50 50">
          <Defs>
            <RadialGradient id="goldGradient4" cx="50%" cy="50%">
              <Stop offset="0%" stopColor="#FCD34D" stopOpacity="1" />
              <Stop offset="50%" stopColor="#F59E0B" stopOpacity="1" />
              <Stop offset="100%" stopColor="#D97706" stopOpacity="0.9" />
            </RadialGradient>
          </Defs>

          <Path
            d="M 48 2 Q 48 15 48 25 Q 48 35 45 40 Q 42 45 38 47 L 32 48 Q 25 48 15 48 Q 10 48 8 45 L 15 42 Q 22 40 28 38 Q 35 35 40 30 Q 44 25 46 18 Q 47 12 48 5 Z"
            fill="url(#goldGradient4)"
            stroke="#FBBF24"
            strokeWidth="0.5"
          />

          <Path
            d="M 42 42 L 35 44 Q 32 42 35 38 L 38 35 Q 40 38 42 42 Z"
            fill="#FCD34D"
            opacity="0.8"
          />

          <Path
            d="M 45 30 Q 42 32 38 30 L 40 25 Q 43 27 45 30 Z"
            fill="#FBBF24"
            opacity="0.7"
          />

          <Path
            d="M 30 45 Q 28 42 30 38 L 25 40 Q 27 43 30 45 Z"
            fill="#F59E0B"
            opacity="0.8"
          />
        </Svg>
      </View>

      <View style={styles.edgeTop}>
        <LinearGradient
          colors={['#FCD34D', '#F59E0B', '#FCD34D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.edgeGradient}
        />
      </View>

      <View style={styles.edgeBottom}>
        <LinearGradient
          colors={['#FCD34D', '#F59E0B', '#FCD34D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.edgeGradient}
        />
      </View>

      <View style={styles.edgeLeft}>
        <LinearGradient
          colors={['#FCD34D', '#F59E0B', '#FCD34D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.edgeGradient}
        />
      </View>

      <View style={styles.edgeRight}>
        <LinearGradient
          colors={['#FCD34D', '#F59E0B', '#FCD34D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.edgeGradient}
        />
      </View>

      <View style={styles.innerGlow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: -2,
    left: -2,
    zIndex: 10,
  },
  cornerTopRight: {
    position: 'absolute',
    top: -2,
    right: -2,
    zIndex: 10,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    zIndex: 10,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    zIndex: 10,
  },
  edgeTop: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 2,
    overflow: 'hidden',
  },
  edgeBottom: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 2,
    overflow: 'hidden',
  },
  edgeLeft: {
    position: 'absolute',
    left: 0,
    top: '25%',
    bottom: '25%',
    width: 2,
    overflow: 'hidden',
  },
  edgeRight: {
    position: 'absolute',
    right: 0,
    top: '25%',
    bottom: '25%',
    width: 2,
    overflow: 'hidden',
  },
  edgeGradient: {
    flex: 1,
  },
  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.6)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 18,
  },
});
