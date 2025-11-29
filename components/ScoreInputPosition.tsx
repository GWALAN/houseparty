import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { semanticColors } from '@/constants/Colors';

type ScoreInputPositionProps = {
  initialPosition: number;
  totalPlayers: number;
  onValueChange: (position: number) => void;
};

function getOrdinalSuffix(position: number): string {
  const lastDigit = position % 10;
  const lastTwoDigits = position % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return 'th';
  }

  switch (lastDigit) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

function formatPosition(position: number): string {
  return `${position}${getOrdinalSuffix(position)}`;
}

export function ScoreInputPosition({
  initialPosition,
  totalPlayers,
  onValueChange,
}: ScoreInputPositionProps) {
  const [selectedPosition, setSelectedPosition] = useState(initialPosition);

  const handlePositionSelect = (position: number) => {
    setSelectedPosition(position);
    onValueChange(position);
  };

  const positions = Array.from({ length: totalPlayers }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <View style={styles.selectedContainer}>
        <Text style={styles.selectedValue}>{formatPosition(selectedPosition)}</Text>
        <Text style={styles.selectedLabel}>Place</Text>
      </View>

      <View style={styles.gridContainer}>
        {positions.map((position) => {
          const isSelected = position === selectedPosition;
          return (
            <Pressable
              key={position}
              style={[
                styles.positionButton,
                isSelected && styles.positionButtonSelected,
              ]}
              onPress={() => handlePositionSelect(position)}
            >
              <Text
                style={[
                  styles.positionText,
                  isSelected && styles.positionTextSelected,
                ]}
              >
                {formatPosition(position)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
  },
  selectedContainer: {
    alignItems: 'center',
    marginBottom: 6,
    padding: 6,
    backgroundColor: '#10B98120',
    borderRadius: 8,
    minWidth: 100,
  },
  selectedLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
  },
  selectedValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    maxWidth: 300,
  },
  positionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 50,
  },
  positionButtonSelected: {
    backgroundColor: '#10B98120',
    borderColor: '#10B981',
  },
  positionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  positionTextSelected: {
    color: '#10B981',
  },
});
