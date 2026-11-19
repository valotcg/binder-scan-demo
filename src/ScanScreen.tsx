import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fetchGames, fetchHistory, fetchPrices, scanPage, type Game, type PageScan, type Price } from './api';
import { Attribution } from './Attribution';
import { CameraSheet, type Photo } from './CameraSheet';
import { CardRow, type Row } from './CardRow';
import type { NewCard } from './collection';
import { HeroBinder } from './HeroBinder';
import { PagePhoto } from './PagePhoto';
import { colors, gradient, money } from './theme';

interface Page {
  id: number;
  photo: Photo;
  scan?: PageScan;
  rows?: Row[];
  error?: string;
}

const STEPS = [
  { icon: 'camera-outline', title: 'Shoot', caption: 'One photo per page' },
  { icon: 'scan-outline', title: 'Identify', caption: 'Up to 12 cards a photo' },
  { icon: 'trending-up-outline', title: 'Price', caption: 'Value and price curve' },
] as const;

/** One photo in: Valo.Vision names the cards, Valo.Data gives their recommended price and each price history. */
async function analyse(photo: Photo, game: string, language: string): Promise<{ scan: PageScan; rows: Row[] }> {
  const scan = await scanPage(photo.uri, game, language);
  const found = scan.cards.filter((card) => card.candidates.length > 0).map((card) => ({ index: card.index, card: card.candidates[0].card }));
  const ids = found.map((item) => item.card.card_id);
  const [prices, histories] = await Promise.all([
    ids.length > 0 ? fetchPrices(ids) : new Map<number, Price>(),
    Promise.all(ids.map((id) => fetchHistory(id).catch(() => []))),
  ]);
  return { scan, rows: found.map((item, i) => ({ ...item, price: prices.get(item.card.card_id) ?? null, history: histories[i] })) };
}

interface ScanScreenProps {
  topInset: number;
  /** Called with every identified card of the session when the user adds them to the collection. */
  onAdd: (cards: NewCard[], game: string, language: string) => void;
}

export function ScanScreen({ topInset, onAdd }: ScanScreenProps) {
  const nextId = useRef(1);
  const [games, setGames] = useState<Game[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [language, setLanguage] = useState('en');
  const [pages, setPages] = useState<Page[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGames()
      .then((list) => {
        setError(null);
        setGames(list);
        setGame(list[0] ?? null);
      })
      .catch((failure: Error) => setError(failure.message));
  }, []);

  const chooseGame = (choice: Game) => {
    setGame(choice);
    if (!choice.languages.includes(language)) setLanguage(choice.languages.includes('en') ? 'en' : choice.languages[0]);
  };

  const addPhoto = (photo: Photo) => {
    if (!game) return;
    const id = nextId.current++;
    setPages((current) => [{ id, photo }, ...current]);
    analyse(photo, game.slug, language)
      .then((result) => {
        setPages((current) => current.map((page) => (page.id === id ? { ...page, ...result } : page)));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })
      .catch((failure: Error) => setPages((current) => current.map((page) => (page.id === id ? { ...page, error: failure.message } : page))));
  };

  const pickFromLibrary = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.7, allowsMultipleSelection: true, selectionLimit: 10 });
    if (!picked.canceled) picked.assets.forEach(addPhoto);
  };

  const rows = pages.flatMap((page) => page.rows ?? []);
  const total = rows.reduce((sum, row) => sum + (row.price?.amount ?? 0), 0);
  const scanned = pages.filter((page) => page.scan).length;
  const pending = pages.some((page) => !page.scan && !page.error);

  const addToCollection = () => {
    if (!game) return;
    onAdd(rows, game.name, language);
    setPages([]);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <Text style={styles.brand}>Binder Scan</Text>
        {rows.length > 0 ? (
          <>
            <Text style={styles.total}>{money(total, 'EUR')}</Text>
            <Text style={styles.muted}>
              {rows.length} cards · {scanned} {scanned === 1 ? 'page' : 'pages'} · {game?.name} {language.toUpperCase()}
            </Text>
          </>
        ) : (
          <Text style={styles.lead}>{pages.length > 0 ? 'Identifying your cards…' : 'Every card in your binder, identified and priced.'}</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error && <Text style={styles.error}>{error}</Text>}

        {pages.length === 0 && (
          <>
            <HeroBinder />
            <View style={styles.steps}>
              {STEPS.map((step) => (
                <View key={step.title} style={styles.step}>
                  <Ionicons name={step.icon} size={20} color={colors.accentAlt} />
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepCaption}>{step.caption}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.label}>Game · {games.length} supported</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.strip}>
              {games.map((choice) => (
                <Chip key={choice.slug} label={choice.name} active={choice.slug === game?.slug} onPress={() => chooseGame(choice)} />
              ))}
            </ScrollView>
            <Text style={styles.label}>Card language</Text>
            <View style={styles.chips}>
              {game?.languages.map((code) => (
                <Chip key={code} label={code.toUpperCase()} active={code === language} onPress={() => setLanguage(code)} />
              ))}
            </View>
            <Attribution />
          </>
        )}

        {pages.map((page, i) => (
          <View key={page.id} style={styles.page}>
            <View style={styles.pageHead}>
              <Text style={styles.pageTitle}>Page {pages.length - i}</Text>
              {page.rows && (
                <Text style={styles.muted}>
                  {page.rows.length} cards · {money(page.rows.reduce((sum, row) => sum + (row.price?.amount ?? 0), 0), 'EUR')}
                </Text>
              )}
              {!page.scan && !page.error && <Text style={styles.muted}>Identifying cards…</Text>}
            </View>
            <PagePhoto uri={page.photo.uri} aspectRatio={page.photo.width / page.photo.height} cards={page.error ? [] : page.scan?.cards} />
            {page.error && <Text style={styles.error}>{page.error}</Text>}
            {page.rows?.map((row) => <CardRow key={row.index} card={row.card} price={row.price} history={row.history} badge={String(row.index)} />)}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.square} onPress={pickFromLibrary} disabled={!game} accessibilityLabel="Pick photos from the library">
          <Ionicons name="images" size={22} color={colors.text} />
        </Pressable>
        {rows.length > 0 ? (
          <>
            <Pressable style={styles.square} onPress={() => setCameraOpen(true)} accessibilityLabel="Scan more pages">
              <Ionicons name="camera" size={22} color={colors.text} />
            </Pressable>
            <Pressable style={styles.grow} onPress={addToCollection} disabled={pending}>
              <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.button, pending && styles.dimmed]}>
                <Ionicons name="add-circle" size={20} color={colors.onAccent} />
                <Text style={styles.buttonLabel}>
                  Add {rows.length} {rows.length === 1 ? 'card' : 'cards'} to collection
                </Text>
              </LinearGradient>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.grow} onPress={() => setCameraOpen(true)} disabled={!game}>
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
              <Ionicons name="camera" size={20} color={colors.onAccent} />
              <Text style={styles.buttonLabel}>Scan binder pages</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>

      <CameraSheet
        visible={cameraOpen}
        pages={[...pages].reverse().map((page) => ({ id: page.id, uri: page.photo.uri, cards: page.error ? null : page.rows?.length }))}
        onPhoto={addPhoto}
        onLibrary={pickFromLibrary}
        onClose={() => setCameraOpen(false)}
      />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, gap: 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { color: colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  lead: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4, lineHeight: 30, marginTop: 6, maxWidth: 300 },
  total: { color: colors.text, fontSize: 40, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  muted: { color: colors.muted, fontSize: 13 },
  content: { padding: 16, gap: 12 },
  steps: { flexDirection: 'row', gap: 8 },
  step: { flex: 1, gap: 2, padding: 10, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  stepTitle: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 4 },
  stepCaption: { color: colors.muted, fontSize: 11, lineHeight: 14 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 },
  bleed: { marginHorizontal: -16, flexGrow: 0 },
  strip: { paddingHorizontal: 16, gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chipLabelActive: { color: colors.onAccent, fontWeight: '800' },
  page: { gap: 10, marginBottom: 12 },
  pageHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  pageTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  error: { color: colors.down, fontSize: 14 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  square: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  grow: { flex: 1 },
  button: { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dimmed: { opacity: 0.5 },
  buttonLabel: { color: colors.onAccent, fontSize: 15, fontWeight: '800' },
});
