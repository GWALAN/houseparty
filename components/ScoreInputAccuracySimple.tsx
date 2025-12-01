import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import { LongPressButton } from './LongPressButton';

type ScoreInputAccuracySimpleProps = {
  initialHits?: number;
  maxAttempts: number;
  onValueChange: (score: number, hits: number, attempts: number) => void;
};

export function ScoreInputAccuracySimple({
  initialHits = 0,
  maxAttempts,
  onValueChange,
}: ScoreInputAccuracySimpleProps) {
  const [hits, setHits] = useState(initialHits);

  const handleIncrement = () => {
    if (hits < maxAttempts) {
      const newHits = hits + 1;
      setHits(newHits);
      const percentage = (newHits / maxAttempts) * 100;
      onValueChange(percentage, newHits, maxAttempts);
    }
  };

  const handleDecrement = () => {
    if (hits > 0) {
      const newHits = hits - 1;
      setHits(newHits);
      const percentage = (newHits / maxAttempts) * 100;
      onValueChange(percentage, newHits, maxAttempts);
    }
  };

  const percentage = (hits / maxAttempts) * 100;
  const isMaxed = hits >= maxAttempts;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tap + for each successful hit</Text>

      <View style={styles.counterContainer}>
        <LongPressButton
          style={[styles.button, styles.minusButton, hits === 0 && styles.buttonDisabled]}
          onPress={handleDecrement}
          disabled={hits === 0}
          delayBeforeRepeat={400}
          accelerationFactor={0.88}
        >
          <Minus size={20} color={hits === 0 ? '#64748B' : '#EF4444'} />
        </LongPressButton>

        <View style={styles.scoreDisplay}>
          <Text style={styles.hitsValue}>{hits}</Text>
          <Text style={styles.divider}>/</Text>
          <Text style={styles.attemptsValue}>{maxAttempts}</Text>
        </View>

        <LongPressButton
          style={[styles.button, styles.plusButton, isMaxed && styles.buttonDisabled]}
          onPress={handleIncrement}
          disabled={isMaxed}
          delayBeforeRepeat={400}
          accelerationFactor={0.88}
        >
          <Plus size={20} color={isMaxed ? '#64748B' : '#10B981'} />
        </LongPressButton>
      </View>

      <View style={styles.resultContainer}>
        <Text style={styles.resultLabel}>Accuracy</Text>
        <Text style={[styles.resultValue, isMaxed && styles.resultMaxed]}>
          {percentage.toFixed(1)}%
        </Text>
      </View>

      {isMaxed && (
        <Text style={styles.maxedText}>Max reached!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 6,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  plusButton: {
    backgroundColor: '#10B98120',
    borderColor: '#10B981',
  },
  minusButton: {
    backgroundColor: '#EF444420',
    borderColor: '#EF4444',
  },
  buttonDisabled: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    opacity: 0.5,
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  hitsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    fontSize: 24,
    fontWeight: '700',
    color: '#64748B',
  },
  attemptsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#94A3B8',
    fontVariant: ['tabular-nums'],
  },
  resultContainer: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#10B98120',
    borderRadius: 10,
    width: '100%',
  },
  resultLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
  },
  resultMaxed: {
    color: '#F59E0B',
  },
  maxedText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '600',
    textAlign: 'center',
  },
});
