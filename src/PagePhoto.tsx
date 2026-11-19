import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { PageCard } from './api';
import { colors } from './theme';

interface PagePhotoProps {
  uri: string;
  aspectRatio: number;
  /** Cards found on the page; undefined while the scan is running. */
  cards?: PageCard[];
}

/** The photo of the page: a sweeping line while Valo.Vision works, then one numbered frame per detected card. */
export function PagePhoto({ uri, aspectRatio, cards }: PagePhotoProps) {
  return (
    <View style={[styles.frame, { aspectRatio }]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      {cards ? cards.map((card, i) => <CardFrame key={card.index} card={card} order={i} />) : <Sweep />}
    </View>
  );
}

function Sweep() {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(progress, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [progress]);
  const top = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0%', '92%', '0%'] });
  return (
    <View style={[StyleSheet.absoluteFill, styles.dim]}>
      <Animated.View style={[styles.sweep, { top }]}>
        <LinearGradient colors={['transparent', colors.accentAlt, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sweepLine} />
      </Animated.View>
    </View>
  );
}

function CardFrame({ card, order }: { card: PageCard; order: number }) {
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(appear, { toValue: 1, delay: order * 70, friction: 7, useNativeDriver: true }).start();
  }, [appear, order]);
  const { x, y, width, height } = card.detection.box;
  const found = card.candidates.length > 0;
  return (
    <Animated.View
      style={[
        styles.card,
        { left: `${x * 100}%`, top: `${y * 100}%`, width: `${width * 100}%`, height: `${height * 100}%` },
        { borderColor: found ? colors.accentAlt : colors.down, opacity: appear, transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [1.12, 1] }) }] },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: found ? colors.accentAlt : colors.down }]}>
        <Text style={styles.badgeLabel}>{card.index}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dim: { backgroundColor: 'rgba(8,7,15,0.45)' },
  sweep: { position: 'absolute', left: 0, right: 0, height: 3 },
  sweepLine: { flex: 1, shadowColor: colors.accentAlt, shadowOpacity: 1, shadowRadius: 12 },
  card: { position: 'absolute', borderWidth: 2, borderRadius: 8 },
  badge: { position: 'absolute', left: -2, top: -2, minWidth: 22, height: 22, borderTopLeftRadius: 8, borderBottomRightRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeLabel: { color: colors.onAccent, fontSize: 12, fontWeight: '800' },
});
