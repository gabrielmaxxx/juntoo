/**
 * Haptic feedback utility for mobile devices.
 * Uses the Vibration API when available.
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const patterns: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 30, 10],
  error: [30, 50, 30, 50, 30],
};

export const haptic = (style: HapticStyle = 'light') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(patterns[style]);
    } catch {
      // Silently fail on unsupported devices
    }
  }
};
