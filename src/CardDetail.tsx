import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { change, type Holding } from './collection';
import { Sparkline } from './Sparkline';
import { colors, money } from './theme';

interface CardDetailProps {
  /** The card to show; null keeps the sheet closed. */
  holding: Holding | null;
  onClose: () => void;
  onQuantity: (cardId: number, quantity: number) => void;
}

/** One card of the collection: its image, price, price curve and how many copies are owned. */
export function CardDetail({ holding, onClose, onQuantity }: CardDetailProps) {
  const { width } = useWindowDimensions();
  const moved = holding ? change(holding.history) : null;
  const color = moved && moved.ratio < 0 ? colors.down : colors.up;
  return (
    <Modal visible={holding !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {holding && (
        <View style={styles.sheet}>
          <View style={styles.bar}>
            <Text style={styles.caption}>
              {holding.game} · {holding.language.toUpperCase()}
            </Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Image source={holding.card.image_url ? { uri: holding.card.image_url } : null} style={styles.image} contentFit="contain" transition={200} />
            <Text style={styles.name}>{holding.card.name}</Text>
            <Text style={styles.caption}>{[holding.card.edition?.name, holding.card.number].filter(Boolean).join(' · ')}</Text>

            <View style={styles.priceLine}>
              <Text style={styles.price}>{holding.price ? money(holding.price.amount, holding.price.currency) : 'No price yet'}</Text>
              {moved && (
                <Text style={[styles.moved, { color }]}>
                  {moved.ratio >= 0 ? '+' : ''}
                  {(moved.ratio * 100).toFixed(1)} % · {moved.days} d
                </Text>
              )}
            </View>

            {holding.history.length > 1 ? (
              <View style={styles.chart}>
                <Sparkline points={holding.history} width={width - 58} height={140} color={color} />
                <View style={styles.axis}>
                  <Text style={styles.small}>{holding.history[0].date}</Text>
                  <Text style={styles.small}>{holding.history[holding.history.length - 1].date}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.caption}>No price history for this card yet.</Text>
            )}

            <View style={styles.quantity}>
              <Text style={styles.quantityLabel}>Copies</Text>
              <Pressable style={styles.step} onPress={() => onQuantity(holding.card.card_id, holding.quantity - 1)} disabled={holding.quantity === 1} accessibilityLabel="One copy less">
                <Ionicons name="remove" size={20} color={holding.quantity === 1 ? colors.border : colors.text} />
              </Pressable>
              <Text style={styles.count}>{holding.quantity}</Text>
              <Pressable style={styles.step} onPress={() => onQuantity(holding.card.card_id, holding.quantity + 1)} accessibilityLabel="One copy more">
                <Ionicons name="add" size={20} color={colors.text} />
              </Pressable>
            </View>

            <Pressable
              style={styles.remove}
              onPress={() => {
                onQuantity(holding.card.card_id, 0);
                onClose();
              }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.down} />
              <Text style={styles.removeLabel}>Remove from collection</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  image: { alignSelf: 'center', width: 220, height: 308, borderRadius: 10, marginBottom: 8 },
  name: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  caption: { color: colors.muted, fontSize: 14 },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 6 },
  price: { color: colors.text, fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] },
  moved: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chart: { padding: 12, gap: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { color: colors.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  quantity: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  quantityLabel: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  step: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  count: { color: colors.text, fontSize: 18, fontWeight: '800', minWidth: 24, textAlign: 'center', fontVariant: ['tabular-nums'] },
  remove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  removeLabel: { color: colors.down, fontSize: 15, fontWeight: '700' },
});
