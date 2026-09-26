/**
 * Container colours, one per shipping line. This is the single place colours
 * are defined: core validates levels against the keys, render paints the
 * containers and the UI draws the order queue from the same values.
 */
export const PALETTE = {
  red: { label: 'Red', hex: '#c8463d' },
  orange: { label: 'Orange', hex: '#e07a2c' },
  yellow: { label: 'Yellow', hex: '#e8b92f' },
  green: { label: 'Green', hex: '#3f9a57' },
  blue: { label: 'Blue', hex: '#2f6db3' },
  purple: { label: 'Purple', hex: '#7a52a8' },
  white: { label: 'White', hex: '#e9e6de' },
} as const satisfies Record<string, { label: string; hex: string }>;

export type ContainerColor = keyof typeof PALETTE;

export const CONTAINER_COLORS = Object.keys(PALETTE) as ContainerColor[];
