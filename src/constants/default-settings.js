// Grows as features need local settings — nothing is pre-declared beyond
// what's actually in use. Both keys below are flat (no nesting) since
// useSettings() paths are dot-notation and these don't need grouping yet.
export const defaultSettings = {
  theme: 'system', // 'system' | 'light' | 'dark'
  debug: false,
}
