import { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { semanticColors, Colors } from '@/constants/Colors';
import { LongPressButton } from './LongPressButton';

type ScoreInputQuickTallyProps = {
  initialValue: number;
  unit: string;
  step: number;
  allowDecimals: boolean;
  onValueChange: (value: number) => void;
};

export function ScoreInputQuickTally({
  initialValue,
  unit,
  step,
  allowDecimals,
  onValueChange,
}: ScoreInputQuickTallyProps) {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  const handleIncrement = () => {
    const newValue = value + step;
    setValue(newValue);
    onValueChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(0, value - step);
    setValue(newValue);
    onValueChange(newValue);
  };

  const handleDirectInput = () => {
    const parsed = parseFloat(inputValue) || 0;
    setValue(parsed);
    onValueChange(parsed);
    setIsEditing(false);
  };

  const formatValue = (val: number) => {
    return allowDecimals ? val.toFixed(2) : Math.round(val).toString();
  };

  return (
    <View style={styles.container}>
      <LongPressButton
        style={styles.button}
        onPress={handleDecrement}
        delayBeforeRepeat={400}
        accelerationFactor={0.88}
      >
        <Minus size={28} color="#FFFFFF" />
      </LongPressButton>

      <View style={styles.valueContainer}>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            keyboardType={allowDecimals ? 'decimal-pad' : 'number-pad'}
            onBlur={handleDirectInput}
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <Pressable onLongPress={() => setIsEditing(true)}>
            <Text style={styles.valueText}>{formatValue(value)}</Text>
          </Pressable>
        )}
        <Text style={styles.unitText}>{unit}</Text>
      </View>

      <LongPressButton
        style={styles.button}
        onPress={handleIncrement}
        delayBeforeRepeat={400}
        accelerationFactor={0.88}
      >
        <Plus size={28} color="#FFFFFF" />
      </LongPressButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueContainer: {
    alignItems: 'center',
    minWidth: 100,
  },
  valueText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  input: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    minWidth: 100,
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
});
