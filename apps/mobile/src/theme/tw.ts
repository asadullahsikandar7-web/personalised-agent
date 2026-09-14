/**
 * Centralized NativeWind class-name tokens. Every themed surface in the app is built from these
 * instead of scattering `dark:` variants across every screen - keeps the light/dark contract in
 * exactly one place. See src/theme/colors.ts and tailwind.config.js for the underlying palette.
 */
export const tw = {
  screen: 'flex-1 bg-light-background dark:bg-dark-background',
  screenPadded: 'flex-1 bg-light-background dark:bg-dark-background px-5',
  card: 'bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-4',
  cardAlt: 'bg-light-surfaceAlt dark:bg-dark-surfaceAlt rounded-2xl p-4',
  divider: 'border-b border-light-border dark:border-dark-border',

  textPrimary: 'text-light-textPrimary dark:text-dark-textPrimary',
  textSecondary: 'text-light-textSecondary dark:text-dark-textSecondary',
  textMuted: 'text-light-textMuted dark:text-dark-textMuted',
  heading: 'text-light-textPrimary dark:text-dark-textPrimary font-bold text-2xl',
  subheading: 'text-light-textPrimary dark:text-dark-textPrimary font-semibold text-lg',
  label: 'text-light-textSecondary dark:text-dark-textSecondary text-sm font-medium',

  buttonPrimary: 'bg-light-primary dark:bg-dark-primary rounded-xl py-3.5 px-5 items-center justify-center',
  buttonPrimaryText: 'text-white font-semibold text-base',
  buttonSecondary:
    'bg-light-primaryMuted dark:bg-dark-primaryMuted rounded-xl py-3.5 px-5 items-center justify-center',
  buttonSecondaryText: 'text-light-primary dark:text-dark-primary font-semibold text-base',
  buttonDanger: 'bg-light-danger dark:bg-dark-danger rounded-xl py-3.5 px-5 items-center justify-center',
  buttonGhost: 'rounded-xl py-3.5 px-5 items-center justify-center',
  buttonGhostText: 'text-light-textSecondary dark:text-dark-textSecondary font-medium text-base',

  input:
    'bg-light-surfaceAlt dark:bg-dark-surfaceAlt border border-light-border dark:border-dark-border rounded-xl px-4 py-3.5 text-light-textPrimary dark:text-dark-textPrimary',
  inputError: 'border-light-danger dark:border-dark-danger',
  errorText: 'text-light-danger dark:text-dark-danger text-sm mt-1',

  pill: 'rounded-full px-3 py-1 bg-light-primaryMuted dark:bg-dark-primaryMuted',
  pillText: 'text-light-primary dark:text-dark-primary text-xs font-semibold',

  badgeSuccess: 'rounded-full px-2.5 py-1 bg-light-success/15 dark:bg-dark-success/15',
  badgeSuccessText: 'text-light-success dark:text-dark-success text-xs font-semibold',
  badgeWarning: 'rounded-full px-2.5 py-1 bg-light-warning/15 dark:bg-dark-warning/15',
  badgeWarningText: 'text-light-warning dark:text-dark-warning text-xs font-semibold',
  badgeDanger: 'rounded-full px-2.5 py-1 bg-light-danger/15 dark:bg-dark-danger/15',
  badgeDangerText: 'text-light-danger dark:text-dark-danger text-xs font-semibold',
} as const;
