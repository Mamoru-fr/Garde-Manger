export const colors = {
  // Client Theme - Orange/Warm
  client: {
    gradientStart: '#FFC837',
    gradientEnd: '#FF8008',
    text: '#1a1a1a',
    textSecondary: 'rgba(26, 26, 26, 0.8)',
    textTertiary: 'rgba(26, 26, 26, 0.7)',
    shadow: 'rgba(255, 200, 55, 0.4)',
  },
  
  // Driver Theme - Purple/Indigo
  driver: {
    gradientStart: '#4F46E5',
    gradientEnd: '#7C3AED',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.9)',
    textTertiary: 'rgba(255, 255, 255, 0.8)',
    shadow: 'rgba(79, 70, 229, 0.4)',
  },
  
  // Admin Theme - Dark Slate/Purple/Indigo
  admin: {
    gradientStart: '#1e293b', // slate-800
    gradientMid: '#581c87',    // purple-900
    gradientEnd: '#312e81',    // indigo-900
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.9)',
    textTertiary: 'rgba(255, 255, 255, 0.8)',
    shadow: 'rgba(88, 28, 135, 0.5)',
  },
  
  // Common Colors
  common: {
    white: '#ffffff',
    black: '#000000',
    blurOverlay: 'rgba(255, 255, 255, 0.15)',
  },
} as const;

type Role = 'client' | 'driver' | 'admin';

// Helper function to get Tailwind gradient classes
export const getGradientClasses = (role: Role): string => {
  const theme = colors[role];
  if (role === 'admin' && 'gradientMid' in theme) {
    return `bg-gradient-to-br from-[${theme.gradientStart}] via-[${theme.gradientMid}] to-[${theme.gradientEnd}]`;
  }
  return `bg-gradient-to-br from-[${theme.gradientStart}] to-[${theme.gradientEnd}]`;
};

// Helper function to get Tailwind text color class
export const getTextClasses = (role: Role, variant: 'primary' | 'secondary' | 'tertiary' = 'primary'): string => {
  const theme = colors[role];
  switch (variant) {
    case 'secondary':
      return `text-[${theme.textSecondary}]`;
    case 'tertiary':
      return `text-[${theme.textTertiary}]`;
    default:
      return `text-[${theme.text}]`;
  }
};

// Helper function to get Tailwind shadow class
export const getShadowClasses = (role: Role): string => {
  const theme = colors[role];
  return `shadow-[0_6px_20px_${theme.shadow}]`;
};

// Helper function to get hover shadow class
export const getHoverShadowClasses = (role: Role): string => {
  const theme = colors[role];
  return `hover:shadow-[0_8px_24px_${theme.shadow}]`;
};

// Combined helper for button styles
export const getButtonClasses = (role: Role): string => {
  return `${getGradientClasses(role)} ${getTextClasses(role)} ${getShadowClasses(role)} ${getHoverShadowClasses(role)}`;
};

// Helper to get all theme classes at once
export const getThemeClasses = (role: Role) => ({
  gradient: getGradientClasses(role),
  text: getTextClasses(role),
  textSecondary: getTextClasses(role, 'secondary'),
  textTertiary: getTextClasses(role, 'tertiary'),
  shadow: getShadowClasses(role),
  hoverShadow: getHoverShadowClasses(role),
  button: getButtonClasses(role),
});
