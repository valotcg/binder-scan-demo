export const colors = {
  background: '#08070f',
  surface: '#13111f',
  surfaceRaised: '#1b182b',
  border: '#2a2640',
  text: '#ffffff',
  muted: '#9d98b8',
  accent: '#a78bfa',
  accentAlt: '#22d3ee',
  up: '#22c55e',
  down: '#f43f5e',
  onAccent: '#08070f',
} as const;

export const gradient = ['#a78bfa', '#6366f1', '#22d3ee'] as const;

export const money = (amount: number, currency: string) => new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(amount);
