import { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { semanticColors } from '@/constants/Colors';
import {
  type DistanceUnit,
  type WeightUnit,
  convertDistanceToMeters,
  convertDistanceFromMeters,
  convertWeightToKg,
  convertWeightFromKg,
  getDistanceUnitLabel,
  getWeightUnitLabel,
} from '@/lib/unitConversions';

type ScoreInputUnitProps = {
  initialValue: number;
  measurementType: 'distance' | 'weight';
  unit: DistanceUnit | WeightUnit;
  allowDecimals: boolean;
  onValueChange: (canonicalValue: number, displayValue: number) => void;
};

export function ScoreInputUnit({
  initialValue,
  measurementType,
  unit,
  allowDecimals,
  onValueChange,
}: ScoreInputUnitProps) {
  const displayValue =
    measurementType === 'distance'
      ? convertDistanceFromMeters(initialValue, unit as DistanceUnit)
      : convertWeightFromKg(initialValue, unit as WeightUnit);

  const [value, setValue] = useState(displayValue);
  const [inputValue, setInputValue] = useState(displayValue.toFixed(allowDecimals ? 1 : 0));
  const [isEditing, setIsEditing] = useState(false);

  const handleDirectInput = () => {
    const parsed = parseFloat(inputValue) || 0;
    setValue(parsed);

    const canonical =
      measurementType === 'distance'
        ? convertDistanceToMeters(parsed, unit as DistanceUnit)
        : convertWeightToKg(parsed, unit as WeightUnit);

    onValueChange(canonical, parsed);
    setIsEditing(false);
  };

  const handleClear = () => {
    setValue(0);
    setInputValue('0');
    onValueChange(0, 0);
  };

  const formatValue = (val: number) => {
    return allowDecimals ? val.toFixed(1) : Math.round(val).toString();
  };

  const unitLabel =
    measurementType === 'distance'
      ? getDistanceUnitLabel(unit as DistanceUnit)
      : getWeightUnitLabel(unit as WeightUnit);

  const canonicalValue =
    measurementType === 'distance'
      ? convertDistanceToMeters(value, unit as DistanceUnit)
      : convertWeightToKg(value, unit as WeightUnit);

  const canonicalUnit = measurementType === 'distance' ? 'm' : 'kg';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.label}>
        {measurementType === 'distance' ? 'Distance' : 'Weight'} Measurement
      </Text>
      <Text style={styles.sublabel}>Enter value in {unitLabel}</Text>

      <View style={styles.displayContainer}>
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
          <Pressable onPress={() => setIsEditing(true)} style={styles.valuePressable}>
            <Text style={styles.valueText}>{formatValue(value)}</Text>
          </Pressable>
        )}
        <Text style={styles.unitText}>{unitLabel}</Text>
      </View>

      <View style={styles.conversionContainer}>
        <Text style={styles.conversionLabel}>Stored As</Text>
        <Text style={styles.conversionValue}>
          {canonicalValue.toFixed(2)} {canonicalUnit}
        </Text>
      </View>

      <Pressable style={styles.clearButton} onPress={handleClear}>
        <Text style={styles.clearText}>Clear</Text>
      </Pressable>

      <Text style={styles.hint}>Tap number to edit directly</Text>
      <Text style={styles.subhint}>
        All values stored in {canonicalUnit} for consistency
      </Text>
    </KeyboardAvoidingView>
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
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sublabel: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  displayContainer: {
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
    marginVertical: 6,
  },
  valuePressable: {
    padding: 6,
    minWidth: 120,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
  },
  unitText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  input: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    minWidth: 120,
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  conversionContainer: {
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    minWidth: 160,
  },
  conversionLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  conversionValue: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  clearButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#334155',
    borderRadius: 8,
    marginTop: 4,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  hint: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
  },
  subhint: {
    fontSize: 9,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
