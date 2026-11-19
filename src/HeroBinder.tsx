import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from './theme';

const ROWS = 3;
const COLUMNS = 3;

/** A stylised binder page for the home screen: the scan line passes and a frame lands on each card, in a loop. */
export function HeroBinder() {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(progress, { toValue: 1, duration: 3600, easing: Easing.linear, useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const sweepTop = progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: ['0%', '100%', '100%'] });
  const sweepOpacity = progress.interpolate({ inputRange: [0, 0.05, 0.4, 0.45, 1], outputRange: [0, 1, 1, 0, 0] });

  return (
    <View style={styles.page}>
      {Array.from({ length: ROWS }, (_, row) => {
        // The frames of a row appear when the scan line has crossed it, and fade before the next pass.
        const landed = ((row + 1) / ROWS) * 0.45;
        const framed = progress.interpolate({ inputRange: [0, landed - 0.04, landed, 0.9, 1], outputRange: [0, 0, 1, 1, 0] });
        return (
          <View key={row} style={styles.row}>
            {Array.from({ length: COLUMNS }, (_, column) => (
              <View key={column} style={styles.card}>
                <LinearGradient colors={[colors.surfaceRaised, colors.surface]} style={StyleSheet.absoluteFill} />
                <View style={styles.art} />
                <View style={styles.line} />
                <Animated.View style={[styles.frame, { opacity: framed }]} />
              </View>
            ))}
          </View>
        );
      })}
      <Animated.View style={[styles.sweep, { top: sweepTop, opacity: sweepOpacity }]}>
        <LinearGradient colors={['transparent', colors.accentAlt, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sweepLine} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignSelf: 'center', width: 200, aspectRatio: 0.78, padding: 10, gap: 8, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row', gap: 8 },
  card: { flex: 1, borderRadius: 6, overflow: 'hidden', padding: 5, gap: 4, borderWidth: 1, borderColor: colors.border },
  art: { flex: 1, borderRadius: 3, backgroundColor: colors.border },
  line: { height: 4, width: '70%', borderRadius: 2, backgroundColor: colors.border },
  frame: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 6, borderWidth: 2, borderColor: colors.accentAlt },
  sweep: { position: 'absolute', left: 0, right: 0, height: 3 },
  sweepLine: { flex: 1 },
});
