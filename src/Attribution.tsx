import { StyleSheet, Text } from 'react-native';
import { colors } from './theme';

/** Credit line shown wherever ValoTCG data is displayed. */
export function Attribution() {
  return <Text style={styles.line}>Prices and card recognition by ValoTCG</Text>;
}

const styles = StyleSheet.create({
  line: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
