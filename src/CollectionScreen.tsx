import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Attribution } from './Attribution';
import { CardDetail } from './CardDetail';
import { CardRow } from './CardRow';
import { change, valueCurve, type Holding } from './collection';
import { Sparkline } from './Sparkline';
import { colors, money } from './theme';

interface CollectionScreenProps {
  topInset: number;
  holdings: Holding[];
  refreshedAt: string | null;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  onQuantity: (cardId: number, quantity: number) => void;
  onScan: () => void;
}

const worth = (holding: Holding) => holding.quantity * (holding.price?.amount ?? 0);

/** The collection: its value, how that value moved, and every card sorted by what it is worth. */
export function CollectionScreen({ topInset, holdings, refreshedAt, refreshing, error, onRefresh, onQuantity, onScan }: CollectionScreenProps) {
  const { width } = useWindowDimensions();
  const [openId, setOpenId] = useState<number | null>(null);
  const sorted = [...holdings].sort((a, b) => worth(b) - worth(a));
  const copies = holdings.reduce((sum, holding) => sum + holding.quantity, 0);
  const total = holdings.reduce((sum, holding) => sum + worth(holding), 0);
  const curve = valueCurve(holdings);
  const moved = change(curve.points);
  const color = moved && moved.ratio < 0 ? colors.down : colors.up;
  const open = holdings.find((holding) => holding.card.card_id === openId) ?? null;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <Text style={styles.brand}>Collection</Text>
        <Text style={styles.total}>{money(total, 'EUR')}</Text>
        <View style={styles.line}>
          {moved && (
            <Text style={[styles.moved, { color }]}>
              {moved.ratio >= 0 ? '+' : ''}
              {(moved.ratio * 100).toFixed(1)} % · {moved.days} d
            </Text>
          )}
          <Text style={styles.muted}>
            {copies} {copies === 1 ? 'card' : 'cards'} · {holdings.length} unique
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
        {error && <Text style={styles.error}>{error}</Text>}

        {holdings.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="albums-outline" size={40} color={colors.muted} />
            <Text style={styles.emptyTitle}>Your collection is empty</Text>
            <Text style={styles.emptyText}>Scan a binder page, then add its cards here to follow what they are worth.</Text>
            <Pressable style={styles.emptyButton} onPress={onScan}>
              <Text style={styles.emptyButtonLabel}>Scan a page</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {curve.points.length > 1 && (
              <View style={styles.chart}>
                <Sparkline points={curve.points} width={width - 58} height={120} color={color} />
                <View style={styles.axis}>
                  <Text style={styles.small}>{curve.points[0].date}</Text>
                  <Text style={styles.small}>
                    Based on {curve.tracked} of {copies} cards
                  </Text>
                  <Text style={styles.small}>{curve.points[curve.points.length - 1].date}</Text>
                </View>
              </View>
            )}
            {sorted.map((holding) => (
              <CardRow
                key={holding.card.card_id}
                card={holding.card}
                price={holding.price}
                history={holding.history}
                badge={holding.quantity > 1 ? `×${holding.quantity}` : undefined}
                caption={`${holding.game} · ${holding.language.toUpperCase()}`}
                onPress={() => setOpenId(holding.card.card_id)}
              />
            ))}
            {refreshedAt && <Text style={styles.updated}>Prices updated {new Date(refreshedAt).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })} · pull to refresh</Text>}
          </>
        )}
        <Attribution />
      </ScrollView>

      <CardDetail holding={open} onClose={() => setOpenId(null)} onQuantity={onQuantity} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, gap: 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { color: colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  total: { color: colors.text, fontSize: 40, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  moved: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  muted: { color: colors.muted, fontSize: 13 },
  content: { padding: 16, gap: 12 },
  chart: { padding: 12, gap: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { color: colors.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  updated: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  error: { color: colors.down, fontSize: 14 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 64, paddingHorizontal: 24 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 8 },
  emptyText: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  emptyButton: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  emptyButtonLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
});
