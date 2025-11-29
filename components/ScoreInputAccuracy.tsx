import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { semanticColors } from '@/constants/Colors';

type ScoreInputAccuracyProps = {
  initialHits?: number;
  initialAttempts?: number;
  onValueChange: (score: number, hits: number, attempts: number) => void;
};

export function ScoreInputAccuracy({
  initialHits = 0,
  initialAttempts = 0,
  onValueChange,
}: ScoreInputAccuracyProps) {
  const [hits, setHits] = useState(initialHits);
  const [attempts, setAttempts] = useState(initialAttempts);
  const [hitsInput, setHitsInput] = useState(initialHits.toString());
  const [attemptsInput, setAttemptsInput] = useState(initialAttempts.toString());

  const calculateAndUpdate = (newHits: number, newAttempts: number) => {
    if (newAttempts === 0) {
      onValueChange(0, newHits, newAttempts);
      return;
    }

    const clampedHits = Math.min(newHits, newAttempts);
    const percentage = (clampedHits / newAttempts) * 100;
    onValueChange(percentage, clampedHits, newAttempts);
  };

  const handleHitsChange = (text: string) => {
    setHitsInput(text);
    const parsed = parseInt(text) || 0;
    if (parsed >= 0) {
      setHits(parsed);
      calculateAndUpdate(parsed, attempts);
    }
  };

  const handleAttemptsChange = (text: string) => {
    setAttemptsInput(text);
    const parsed = parseInt(text) || 0;
    if (parsed >= 0) {
      setAttempts(parsed);
      calculateAndUpdate(hits, parsed);
    }
  };

  const percentage = attempts > 0 ? (hits / attempts) * 100 : 0;
  const hasError = hits > attempts || (attempts === 0 && hits > 0);

  return (
    <View style={styles.container}>
      <View style={styles.inputsContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Hits</Text>
          <TextInput
            style={[styles.input, hasError && styles.inputError]}
            value={hitsInput}
            onChangeText={handleHitsChange}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#64748B"
          />
        </View>

        <Text style={styles.divider}>/</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Attempts</Text>
          <TextInput
            style={[styles.input, attempts === 0 && hits > 0 && styles.inputError]}
            value={attemptsInput}
            onChangeText={handleAttemptsChange}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#64748B"
          />
        </View>
      </View>

      <View style={styles.resultContainer}>
        <Text style={styles.resultLabel}>Accuracy</Text>
        <Text style={[styles.resultValue, hasError && styles.resultError]}>
          {percentage.toFixed(1)}%
        </Text>
        <Text style={styles.resultBreakdown}>
          {hits} / {attempts}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  inputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  inputGroup: {
    alignItems: 'center',
    gap: 2,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  input: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    width: 60,
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  divider: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 10,
  },
  resultContainer: {
    alignItems: 'center',
    padding: 6,
    backgroundColor: '#10B98120',
    borderRadius: 8,
    minWidth: 140,
  },
  resultLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 1,
  },
  resultValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
  },
  resultError: {
    color: '#EF4444',
  },
  resultBreakdown: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
});
