import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollectionScreen } from './src/CollectionScreen';
import { useCollection } from './src/collection';
import { ScanScreen } from './src/ScanScreen';
import { colors } from './src/theme';

const TABS = [
  { key: 'scan', label: 'Scan', icon: 'scan' },
  { key: 'collection', label: 'Collection', icon: 'albums' },
] as const;

type Tab = (typeof TABS)[number]['key'];

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

/** Two tabs: Scan turns binder photos into priced cards, Collection keeps them and follows their value. */
function Shell() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('scan');
  const collection = useCollection();
  const copies = collection.holdings.reduce((sum, holding) => sum + holding.quantity, 0);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {/* Both screens stay mounted so a scan in progress survives a visit to the collection. */}
      <View style={[styles.grow, tab !== 'scan' && styles.hidden]}>
        <ScanScreen
          topInset={insets.top}
          onAdd={(cards, game, language) => {
            collection.add(cards, game, language);
            setTab('collection');
          }}
        />
      </View>
      <View style={[styles.grow, tab !== 'collection' && styles.hidden]}>
        <CollectionScreen
          topInset={insets.top}
          holdings={collection.holdings}
          refreshedAt={collection.refreshedAt}
          refreshing={collection.refreshing}
          error={collection.error}
          onRefresh={collection.refresh}
          onQuantity={collection.setQuantity}
          onScan={() => setTab('scan')}
        />
      </View>

      <View style={[styles.tabs, { paddingBottom: insets.bottom + 6 }]}>
        {TABS.map((item) => {
          const active = item.key === tab;
          const tint = active ? colors.accent : colors.muted;
          return (
            <Pressable key={item.key} style={styles.tab} onPress={() => setTab(item.key)} accessibilityRole="tab" accessibilityState={{ selected: active }}>
              <Ionicons name={active ? item.icon : `${item.icon}-outline`} size={22} color={tint} />
              <Text style={[styles.tabLabel, { color: tint }]}>
                {item.label}
                {item.key === 'collection' && copies > 0 ? ` · ${copies}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  grow: { flex: 1 },
  hidden: { display: 'none' },
  tabs: { flexDirection: 'row', paddingTop: 8, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 11, fontWeight: '700' },
});
