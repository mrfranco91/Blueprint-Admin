
export function ensureAccessibleColor(
  foreground: string,
  background: string,
  fallback: string
): string {
  try {
    const getLuminance = (hex: string) => {
      // Convert hex to RGB and then to sRGB, then calculate luminance
      const rgb = hex.replace("#", "").match(/.{2}/g)?.map(v => {
        const c = parseInt(v, 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      if (!rgb) return 0;
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    // Return the original foreground color if contrast is sufficient, otherwise return the fallback
    return contrast >= 4.5 ? foreground : fallback;
  } catch {
    // In case of any error (e.g., invalid hex), return the safe fallback
    return fallback;
  }
}
