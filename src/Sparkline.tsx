import Svg, { Path } from 'react-native-svg';
import type { HistoryPoint } from './api';

interface SparklineProps {
  points: HistoryPoint[];
  width: number;
  height: number;
  color: string;
}

/** Price curve of a card: one point per observed day, scaled to its own minimum and maximum. */
export function Sparkline({ points, width, height, color }: SparklineProps) {
  if (points.length < 2) return null;
  const amounts = points.map((point) => point.amount);
  const min = Math.min(...amounts);
  const range = Math.max(...amounts) - min || 1;
  const pad = 2;
  const x = (i: number) => pad + (i / (points.length - 1)) * (width - 2 * pad);
  const y = (amount: number) => pad + (1 - (amount - min) / range) * (height - 2 * pad);
  const line = points.map((point, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(point.amount).toFixed(1)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      <Path d={`${line} L${x(points.length - 1)},${height} L${x(0)},${height} Z`} fill={color} opacity={0.14} />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
