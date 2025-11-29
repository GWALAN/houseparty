export type DistanceUnit = 'meters' | 'yards' | 'feet';
export type WeightUnit = 'kg' | 'lb';

const METERS_TO_YARDS = 1.09361;
const METERS_TO_FEET = 3.28084;
const KG_TO_LB = 2.20462;

export function convertDistanceToMeters(value: number, fromUnit: DistanceUnit): number {
  switch (fromUnit) {
    case 'meters':
      return value;
    case 'yards':
      return value / METERS_TO_YARDS;
    case 'feet':
      return value / METERS_TO_FEET;
    default:
      return value;
  }
}

export function convertDistanceFromMeters(value: number, toUnit: DistanceUnit): number {
  switch (toUnit) {
    case 'meters':
      return value;
    case 'yards':
      return value * METERS_TO_YARDS;
    case 'feet':
      return value * METERS_TO_FEET;
    default:
      return value;
  }
}

export function convertWeightToKg(value: number, fromUnit: WeightUnit): number {
  switch (fromUnit) {
    case 'kg':
      return value;
    case 'lb':
      return value / KG_TO_LB;
    default:
      return value;
  }
}

export function convertWeightFromKg(value: number, toUnit: WeightUnit): number {
  switch (toUnit) {
    case 'kg':
      return value;
    case 'lb':
      return value * KG_TO_LB;
    default:
      return value;
  }
}

export function formatDistanceWithUnit(value: number, unit: DistanceUnit, decimals: number = 1): string {
  return `${value.toFixed(decimals)} ${unit}`;
}

export function formatWeightWithUnit(value: number, unit: WeightUnit, decimals: number = 1): string {
  return `${value.toFixed(decimals)} ${unit}`;
}

export function getDistanceUnitLabel(unit: DistanceUnit): string {
  switch (unit) {
    case 'meters':
      return 'm';
    case 'yards':
      return 'yd';
    case 'feet':
      return 'ft';
    default:
      return unit;
  }
}

export function getWeightUnitLabel(unit: WeightUnit): string {
  switch (unit) {
    case 'kg':
      return 'kg';
    case 'lb':
      return 'lb';
    default:
      return unit;
  }
}
