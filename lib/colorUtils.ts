export function safeArrayFromColors(colors: any): string[] | null {
  if (!colors) return null;

  let result: any = colors;

  if (typeof colors === 'string') {
    try {
      result = JSON.parse(colors);
    } catch {
      return null;
    }
  }

  if (typeof result === 'object' && !Array.isArray(result)) {
    result = Object.values(result);
  }

  if (!Array.isArray(result)) {
    return null;
  }

  const filtered = result.filter(c => typeof c === 'string' && c.trim().length > 0);

  // LinearGradient requires at least 2 colors
  // If we only have 1 color, duplicate it to create a solid gradient
  if (filtered.length === 1) {
    return [filtered[0], filtered[0]];
  }

  return filtered.length > 0 ? filtered : null;
}

/**
 * Converts hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace('#', '');

  // Handle shorthand hex (e.g., #fff -> #ffffff)
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  if (hex.length !== 6) {
    return null;
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return null;
  }

  return { r, g, b };
}

/**
 * Calculate perceived brightness of a color using the relative luminance formula
 * Returns a value between 0 (black) and 255 (white)
 * Values > 128 are considered "light" colors
 */
export function getColorBrightness(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 128; // Default to medium brightness if parsing fails

  // Using relative luminance formula (ITU-R BT.709)
  // Human eye is more sensitive to green, then red, then blue
  const brightness = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114);
  return brightness;
}

/**
 * Determine if a color is "light" (requires dark text) or "dark" (requires light text)
 * Threshold of 180 works well for accessibility
 */
export function isLightColor(hex: string): boolean {
  const brightness = getColorBrightness(hex);
  return brightness > 180;
}

/**
 * Get the appropriate text color (black or white) based on background color brightness
 * Returns '#000000' for light backgrounds, '#FFFFFF' for dark backgrounds
 */
export function getContrastTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
}

/**
 * Check if an array of colors (like a gradient) is predominantly light
 * Useful for determining text color on gradients
 */
export function isLightGradient(colors: string[] | null): boolean {
  if (!colors || colors.length === 0) return false;

  // Check the first color (most prominent in gradient)
  return isLightColor(colors[0]);
}
