import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SCORING_TYPES, ScoringType, getScoringTypeConfig } from '@/constants/ScoringTypes';
import { DistanceUnit, WeightUnit } from '@/lib/unitConversions';
import { LongPressButton } from '@/components/LongPressButton';
import Emoji3D from '@/components/Emoji3D';

export default function AddGameScreen() {
  const { houseId } = useLocalSearchParams();
  const [gameName, setGameName] = useState('');
  const [scoringType, setScoringType] = useState<ScoringType>('points');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('meters');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [maxAttempts, setMaxAttempts] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleAddGame = async () => {
    try {
      console.log('[ADD GAME] Button pressed');

      if (!gameName.trim()) {
        console.log('[ADD GAME] No game name provided');
        setError('Please enter a game name');
        return;
      }

      if (!user) {
        console.log('[ADD GAME] No authenticated user');
        setError('You must be signed in to add a game');
        return;
      }

      if (!houseId) {
        console.log('[ADD GAME] No house ID provided');
        setError('Invalid house');
        return;
      }

      console.log('[ADD GAME] Starting game creation...', { houseId, gameName, scoringType, userId: user.id });
      setLoading(true);
      setError('');

      const config = getScoringTypeConfig(scoringType);

      const { error: gameError } = await supabase
        .from('games')
        .insert({
          house_id: houseId,
          name: gameName.trim(),
          game_type: 'custom',
          created_by: user.id,
          rules: {},
          scoring_type: scoringType,
          scoring_category: config.category,
          scoring_unit: config.unit,
          lower_is_better: config.lowerIsBetter,
          distance_unit: scoringType === 'distance' ? distanceUnit : null,
          weight_unit: scoringType === 'weight' ? weightUnit : null,
          max_attempts: scoringType === 'accuracy' ? maxAttempts : null,
        });

      if (gameError) {
        console.error('[ADD GAME] Database error:', gameError);
        setError(`Failed to add game: ${gameError.message}`);
        setLoading(false);
        return;
      }

      console.log('[ADD GAME] Game added successfully');
      setLoading(false);
      router.back();
    } catch (err) {
      console.error('[ADD GAME] Unexpected error:', err);
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Add a Game</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <Text style={styles.subtitle}>Enter the name of your game</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="e.g., Beer Pong, Darts"
            placeholderTextColor="#64748B"
            value={gameName}
            onChangeText={setGameName}
            returnKeyType="done"
            editable={!loading}
            autoFocus={false}
          />

          <Text style={styles.sectionTitle}>Select Scoring Type</Text>

          <View style={styles.scoringGrid}>
            {SCORING_TYPES.map((type) => (
              <Pressable
                key={type.id}
                style={[
                  styles.scoringOption,
                  scoringType === type.id && styles.scoringOptionSelected
                ]}
                onPress={() => setScoringType(type.id)}
                disabled={loading}
              >
                <Emoji3D emoji={type.emoji} size="large" />
                <Text style={[
                  styles.scoringLabel,
                  scoringType === type.id && styles.scoringLabelSelected
                ]}>
                  {type.label}
                </Text>
                <Text style={styles.scoringUnit}>{type.unit}</Text>
              </Pressable>
            ))}
          </View>

          {scoringType === 'distance' && (
            <View style={styles.optionSection}>
              <Text style={styles.optionTitle}>Distance Unit</Text>
              <View style={styles.optionButtons}>
                {(['meters', 'feet', 'miles'] as DistanceUnit[]).map((unit) => (
                  <Pressable
                    key={unit}
                    style={[
                      styles.optionButton,
                      distanceUnit === unit && styles.optionButtonSelected
                    ]}
                    onPress={() => setDistanceUnit(unit)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      distanceUnit === unit && styles.optionButtonTextSelected
                    ]}>
                      {unit === 'meters' ? 'Meters' : unit === 'feet' ? 'Feet' : 'Miles'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {scoringType === 'weight' && (
            <View style={styles.optionSection}>
              <Text style={styles.optionTitle}>Weight Unit</Text>
              <View style={styles.optionButtons}>
                {(['kg', 'lb'] as WeightUnit[]).map((unit) => (
                  <Pressable
                    key={unit}
                    style={[
                      styles.optionButton,
                      weightUnit === unit && styles.optionButtonSelected
                    ]}
                    onPress={() => setWeightUnit(unit)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      weightUnit === unit && styles.optionButtonTextSelected
                    ]}>
                      {unit === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {scoringType === 'accuracy' && (
            <View style={styles.optionSection}>
              <Text style={styles.optionTitle}>Max Attempts</Text>
              <View style={styles.attemptsRow}>
                <LongPressButton
                  style={styles.attemptButton}
                  onPress={() => setMaxAttempts(prev => Math.max(1, prev - 1))}
                  delayBeforeRepeat={500}
                  accelerationFactor={0.88}
                >
                  <Text style={styles.attemptButtonText}>-</Text>
                </LongPressButton>
                <Text style={styles.attemptsValue}>{maxAttempts}</Text>
                <LongPressButton
                  style={styles.attemptButton}
                  onPress={() => setMaxAttempts(prev => Math.min(999, prev + 1))}
                  delayBeforeRepeat={500}
                  accelerationFactor={0.88}
                >
                  <Text style={styles.attemptButtonText}>+</Text>
                </LongPressButton>
              </View>
              <Text style={styles.attemptsHint}>Tap to increment, hold to accelerate (max: 999)</Text>
            </View>
          )}

          <Pressable
            style={[styles.button, (!gameName.trim() || loading) && styles.buttonDisabled]}
            onPress={handleAddGame}
            disabled={!gameName.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Add Game</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  form: {
    padding: 24,
    paddingBottom: 120,
    gap: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  error: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    fontSize: 18,
    borderWidth: 2,
    borderColor: '#334155',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  scoringGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  scoringOption: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    gap: 4,
  },
  scoringOptionSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  scoringEmoji: {
    fontSize: 28,
  },
  scoringLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  scoringLabelSelected: {
    color: '#FFFFFF',
  },
  scoringUnit: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
  },
  optionSection: {
    gap: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  optionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  optionButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  optionButtonTextSelected: {
    color: '#FFFFFF',
  },
  attemptsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  attemptButton: {
    width: 50,
    height: 50,
    backgroundColor: '#10B981',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attemptButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  attemptsValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    minWidth: 60,
    textAlign: 'center',
  },
  attemptsHint: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
  },
});
