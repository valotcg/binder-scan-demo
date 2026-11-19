import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Card, HistoryPoint, Price } from './api';
import { Sparkline } from './Sparkline';
import { change as curveChange } from './collection';
import { colors, money } from './theme';

export interface Row {
  index: number;
  card: Card;
  price: Price | null;
  history: HistoryPoint[];
}

interface CardRowProps {
  card: Card;
  price: Price | null;
  history: HistoryPoint[];
  /** Short label on the image corner: the frame number on a scanned page, the quantity in the collection. */
  badge?: string;
  /** Extra line under the edition, such as the game and language. */
  caption?: string;
  onPress?: () => void;
}

/** One card: its catalog image, name, price and price curve. */
export function CardRow({ card, price, history, badge, caption, onPress }: CardRowProps) {
  const change = curveChange(history);
  const color = change && change.ratio < 0 ? colors.down : colors.up;
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <View>
        <Image source={card.image_url ? { uri: card.image_url } : null} style={styles.image} contentFit="contain" transition={200} />
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>{badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={styles.muted} numberOfLines={1}>
          {[card.edition?.name, card.number].filter(Boolean).join(' · ')}
        </Text>
        {caption && (
          <Text style={styles.muted} numberOfLines={1}>
            {caption}
          </Text>
        )}
        {price && <Text style={styles.price}>{money(price.amount, price.currency)}</Text>}
      </View>
      <View style={styles.chart}>
        <Sparkline points={history} width={92} height={38} color={color} />
        {change && (
          <Text style={[styles.change, { color }]}>
            {change.ratio >= 0 ? '+' : ''}
            {(change.ratio * 100).toFixed(1)} % · {change.days} d
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  image: { width: 46, height: 64, borderRadius: 4 },
  badge: { position: 'absolute', left: -6, top: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentAlt },
  badgeLabel: { color: colors.onAccent, fontSize: 11, fontWeight: '800' },
  text: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 13 },
  price: { color: colors.text, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: 2 },
  chart: { alignItems: 'flex-end', gap: 2 },
  change: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
