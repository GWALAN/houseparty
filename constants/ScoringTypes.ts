export type ScoringCategory =
  | 'competitive'
  | 'speed'
  | 'endurance'
  | 'ranking';

export type ScoringType =
  | 'wins'
  | 'distance'
  | 'points'
  | 'weight'
  | 'accuracy'
  | 'reps'
  | 'streak'
  | 'duration'
  | 'ratio'
  | 'reaction_time'
  | 'rank';

export type InputMode = 'timer' | 'quick_tally' | 'measurement' | 'accuracy_dual' | 'ratio_dual' | 'position_selector' | 'unit_measurement';

export type ScoringCategoryConfig = {
  id: ScoringCategory;
  label: string;
  icon: string;
  color: string;
  description: string;
};

export type ScoringTypeConfig = {
  id: ScoringType;
  category: ScoringCategory;
  label: string;
  emoji: string;
  unit: string;
  lowerIsBetter: boolean;
  step: number;
  allowDecimals: boolean;
  description: string;
  inputMode: InputMode;
  quickPresets?: number[];
};

export const SCORING_CATEGORIES: Record<ScoringCategory, ScoringCategoryConfig> = {
  competitive: {
    id: 'competitive',
    label: 'Higher Is Better',
    icon: '🎯',
    color: '#10B981',
    description: 'Winner has the highest score',
  },
  speed: {
    id: 'speed',
    label: 'Faster Is Better',
    icon: '⏱️',
    color: '#3B82F6',
    description: 'Winner has the lowest time',
  },
  endurance: {
    id: 'endurance',
    label: 'Longer Is Better',
    icon: '⏳',
    color: '#F59E0B',
    description: 'Winner lasts the longest',
  },
  ranking: {
    id: 'ranking',
    label: 'Lower Rank Wins',
    icon: '🥇',
    color: '#8B5CF6',
    description: '1st place beats 2nd place',
  },
};

export const SCORING_TYPES: ScoringTypeConfig[] = [
  {
    id: 'points',
    category: 'competitive',
    label: 'Points',
    emoji: '🎯',
    unit: 'pts',
    lowerIsBetter: false,
    step: 1,
    allowDecimals: false,
    description: 'Higher score wins',
    inputMode: 'quick_tally',
  },
  {
    id: 'wins',
    category: 'competitive',
    label: 'Wins',
    emoji: '🏆',
    unit: 'wins',
    lowerIsBetter: false,
    step: 1,
    allowDecimals: false,
    description: 'Count victories',
    inputMode: 'quick_tally',
  },
  {
    id: 'accuracy',
    category: 'competitive',
    label: 'Accuracy',
    emoji: '🎯',
    unit: '%',
    lowerIsBetter: false,
    step: 1,
    allowDecimals: true,
    description: 'Calculated from hits divided by attempts',
    inputMode: 'accuracy_dual',
  },
  {
    id: 'reps',
    category: 'competitive',
    label: 'Reps',
    emoji: '🔁',
    unit: 'reps',
    lowerIsBetter: false,
    step: 1,
    allowDecimals: false,
    description: 'Most reps wins',
    inputMode: 'quick_tally',
  },
  {
    id: 'distance',
    category: 'competitive',
    label: 'Distance',
    emoji: '📏',
    unit: 'meters',
    lowerIsBetter: false,
    step: 0.1,
    allowDecimals: true,
    description: 'Longest distance wins (stored in meters)',
    inputMode: 'unit_measurement',
  },
  {
    id: 'weight',
    category: 'competitive',
    label: 'Weight',
    emoji: '💪',
    unit: 'kg',
    lowerIsBetter: false,
    step: 0.5,
    allowDecimals: true,
    description: 'Heaviest weight wins (stored in kg)',
    inputMode: 'unit_measurement',
  },
  {
    id: 'streak',
    category: 'competitive',
    label: 'Streak',
    emoji: '🔥',
    unit: 'streak',
    lowerIsBetter: false,
    step: 1,
    allowDecimals: false,
    description: 'Longest streak wins',
    inputMode: 'quick_tally',
  },
  {
    id: 'reaction_time',
    category: 'speed',
    label: 'Reaction Time',
    emoji: '⚡',
    unit: 'ms',
    lowerIsBetter: true,
    step: 1,
    allowDecimals: false,
    description: 'Fastest reaction wins',
    inputMode: 'timer',
  },
  {
    id: 'duration',
    category: 'endurance',
    label: 'Duration',
    emoji: '⏳',
    unit: 'sec',
    lowerIsBetter: false,
    step: 1,
    allowDecimals: true,
    description: 'Longest duration wins',
    inputMode: 'timer',
  },
  {
    id: 'rank',
    category: 'ranking',
    label: 'Position',
    emoji: '🥇',
    unit: 'place',
    lowerIsBetter: true,
    step: 1,
    allowDecimals: false,
    description: '1st beats 2nd (ties allowed)',
    inputMode: 'position_selector',
  },
  {
    id: 'ratio',
    category: 'competitive',
    label: 'Ratio',
    emoji: '📊',
    unit: 'ratio',
    lowerIsBetter: false,
    step: 0.01,
    allowDecimals: true,
    description: 'Calculated from A divided by B',
    inputMode: 'ratio_dual',
  },
];

export function getScoringTypeConfig(type: ScoringType): ScoringTypeConfig {
  return SCORING_TYPES.find(st => st.id === type) || SCORING_TYPES[0];
}

export function getScoringTypesByCategory(category: ScoringCategory): ScoringTypeConfig[] {
  return SCORING_TYPES.filter(st => st.category === category);
}

export function getScoringCategory(type: ScoringType): ScoringCategory {
  const config = getScoringTypeConfig(type);
  return config.category;
}

export function formatScore(
  score: number,
  type: ScoringType,
  metadata?: {
    hits?: number;
    attempts?: number;
    numerator?: number;
    denominator?: number;
    unit?: string;
  }
): string {
  const config = getScoringTypeConfig(type);

  if (type === 'accuracy' && metadata?.hits !== undefined && metadata?.hits !== null && metadata?.attempts !== undefined && metadata?.attempts !== null) {
    return `${metadata.hits}/${metadata.attempts} (${score.toFixed(1)}%)`;
  }

  if (type === 'ratio' && metadata?.numerator !== undefined && metadata?.numerator !== null && metadata?.denominator !== undefined && metadata?.denominator !== null) {
    return `${metadata.numerator.toFixed(1)} ÷ ${metadata.denominator.toFixed(1)} = ${score.toFixed(2)}`;
  }

  if (type === 'rank') {
    const position = Math.round(score);
    const lastDigit = position % 10;
    const lastTwoDigits = position % 100;
    let suffix = 'th';
    if (lastTwoDigits < 11 || lastTwoDigits > 13) {
      if (lastDigit === 1) suffix = 'st';
      else if (lastDigit === 2) suffix = 'nd';
      else if (lastDigit === 3) suffix = 'rd';
    }
    return `${position}${suffix} place`;
  }

  if ((type === 'distance' || type === 'weight') && metadata?.unit) {
    return `${score.toFixed(1)} ${metadata.unit}`;
  }

  if (config.allowDecimals) {
    return `${score.toFixed(2)} ${config.unit}`;
  }

  return `${Math.round(score)} ${config.unit}`;
}

export function determineWinner(
  scores: Array<{ id: string; score: number }>,
  type: ScoringType,
  lowerIsBetterOverride?: boolean
): string[] {
  if (scores.length === 0) return [];

  const config = getScoringTypeConfig(type);
  const lowerIsBetter = lowerIsBetterOverride !== undefined ? lowerIsBetterOverride : config.lowerIsBetter;

  const validScores = scores.filter(s => s.score !== 0 || type === 'rank');

  if (validScores.length === 0) return [];

  const sortedScores = [...validScores].sort((a, b) => {
    if (lowerIsBetter) {
      return a.score - b.score;
    }
    return b.score - a.score;
  });

  const winningScore = sortedScores[0].score;

  return sortedScores
    .filter(s => Math.abs(s.score - winningScore) < 0.0001)
    .map(s => s.id);
}
