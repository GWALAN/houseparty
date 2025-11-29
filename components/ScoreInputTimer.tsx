import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Play, Pause, RotateCcw } from 'lucide-react-native';
import { semanticColors, Colors } from '@/constants/Colors';

type ScoreInputTimerProps = {
  initialValue: number;
  unit: string;
  onValueChange: (value: number) => void;
  allowDecimals: boolean;
};

export function ScoreInputTimer({ initialValue, unit, onValueChange, allowDecimals }: ScoreInputTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(initialValue);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      // For milliseconds, increment by 1ms every 1ms
      // For seconds with decimals, increment by 0.01s every 10ms
      // For whole seconds, increment by 1s every 1000ms
      const increment = unit === 'ms' ? 1 : (allowDecimals ? 0.01 : 1);
      const interval = unit === 'ms' ? 1 : (allowDecimals ? 10 : 1000);

      intervalRef.current = setInterval(() => {
        setTime(prev => {
          const newTime = prev + increment;
          return unit === 'ms' ? Math.round(newTime) : parseFloat(newTime.toFixed(2));
        });
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, allowDecimals, unit]);

  useEffect(() => {
    onValueChange(time);
  }, [time, onValueChange]);

  const handleStartStop = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
  };

  const formatTime = (value: number) => {
    if (unit === 'ms') {
      return Math.round(value).toString();
    }
    return allowDecimals ? value.toFixed(2) : Math.round(value).toString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.timerDisplay}>
        <Text style={styles.timeText}>{formatTime(time)}</Text>
        <Text style={styles.unitText}>{unit}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.button, styles.resetButton]}
          onPress={handleReset}
          disabled={isRunning}
        >
          <RotateCcw size={20} color={isRunning ? '#64748B' : '#FFFFFF'} />
        </Pressable>

        <Pressable
          style={[styles.button, styles.primaryButton, isRunning && styles.stopButton]}
          onPress={handleStartStop}
        >
          {isRunning ? (
            <Pause size={24} color="#FFFFFF" />
          ) : (
            <Play size={24} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  timeText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  controls: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: semanticColors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  resetButton: {
    backgroundColor: Colors.neutral[200],
  },
});
