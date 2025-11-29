/**
 * Color palette for the application
 * Based on Tailwind CSS color system
 */

export const Colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb', // Main primary color
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  secondary: {
    50: '#f3f4f6',
    100: '#f9fafb',
    200: '#f3f4f6',
    300: '#e5e7eb',
    400: '#d1d5db',
    500: '#9ca3af',
    600: '#6b7280',
    700: '#4b5563',
    800: '#374151',
    900: '#1f2937',
  },
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669', // Main success color
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626', // Main error color
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
} as const;

// Semantic color names for easier usage
export const semanticColors = {
  background: Colors.neutral[50],
  surface: '#ffffff',
  primary: Colors.primary[600],
  secondary: Colors.neutral[600],
  accent: Colors.success[600],
  text: {
    primary: Colors.neutral[800],
    secondary: Colors.neutral[500],
    inverse: '#ffffff',
  },
  border: Colors.neutral[200],
  shadow: Colors.neutral[900],
} as const;

// Export Colors object with semantic aliases for dark theme
Colors.text = '#FFFFFF';
Colors.textSecondary = '#94A3B8';
Colors.cardBackground = '#1E293B';
Colors.border = '#334155';
Colors.error = '#EF4444';