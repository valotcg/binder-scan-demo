import { useCallback, useEffect, useRef, useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { fetchHistory, fetchPrices, type Card, type HistoryPoint, type Price } from './api';

export interface Holding {
  card: Card;
  game: string;
  language: string;
  quantity: number;
  price: Price | null;
  history: HistoryPoint[];
}

interface Stored {
  holdings: Holding[];
  refreshedAt: string | null;
}

export interface NewCard {
  card: Card;
  price: Price | null;
  history: HistoryPoint[];
}

// The collection lives in one JSON file on the phone. A production app would keep it on its own server, per user.
const file = new File(Paths.document, 'collection.json');
const DAY_MS = 86_400_000;

async function load(): Promise<Stored> {
  if (!file.exists) return { holdings: [], refreshedAt: null };
  return JSON.parse(await file.text()) as Stored;
}

async function save(stored: Stored): Promise<void> {
  if (!file.exists) file.create();
  await file.write(JSON.stringify(stored));
}

/** Value of the collection day by day, from the cards that have a price history. */
export function valueCurve(holdings: Holding[]): { points: HistoryPoint[]; tracked: number } {
  const tracked = holdings.filter((holding) => holding.history.length > 1);
  if (tracked.length === 0) return { points: [], tracked: 0 };
  // Starts on the first day every tracked card has a price, so no value is invented before a card's first observation.
  const start = tracked.map((holding) => holding.history[0].date).sort().at(-1)!;
  const dates = [...new Set(tracked.flatMap((holding) => holding.history.map((point) => point.date)))].filter((date) => date >= start).sort();
  const points = dates.map((date) => ({
    date,
    amount: tracked.reduce((sum, holding) => sum + holding.quantity * holding.history.findLast((point) => point.date <= date)!.amount, 0),
  }));
  return { points, tracked: tracked.reduce((sum, holding) => sum + holding.quantity, 0) };
}

/** Relative change between the first and the last point of a curve, with the number of days it covers. */
export function change(points: HistoryPoint[]): { ratio: number; days: number } | null {
  if (points.length < 2 || points[0].amount === 0) return null;
  const first = points[0];
  const last = points[points.length - 1];
  return { ratio: (last.amount - first.amount) / first.amount, days: Math.round((Date.parse(last.date) - Date.parse(first.date)) / DAY_MS) };
}

export function useCollection() {
  const [stored, setStored] = useState<Stored>({ holdings: [], refreshedAt: null });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(stored);

  const commit = useCallback((next: Stored) => {
    latest.current = next;
    setStored(next);
    save(next).catch((failure: Error) => setError(failure.message));
  }, []);

  /** Valo.Data: current prices (1 credit per 10 cards) and price histories (3 credits per card) of the whole collection. */
  const refresh = useCallback(async () => {
    const { holdings } = latest.current;
    if (holdings.length === 0) return;
    setRefreshing(true);
    try {
      const ids = holdings.map((holding) => holding.card.card_id);
      const [prices, histories] = await Promise.all([fetchPrices(ids), Promise.all(ids.map((id) => fetchHistory(id).catch(() => null)))]);
      const fresh = new Map(ids.map((id, i) => [id, { price: prices.get(id) ?? null, history: histories[i] }]));
      commit({
        holdings: latest.current.holdings.map((holding) => {
          const update = fresh.get(holding.card.card_id);
          return update ? { ...holding, price: update.price ?? holding.price, history: update.history ?? holding.history } : holding;
        }),
        refreshedAt: new Date().toISOString(),
      });
      setError(null);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, [commit]);

  useEffect(() => {
    load()
      .then((loaded) => {
        latest.current = loaded;
        setStored(loaded);
        // Prices move once a day at most: a collection refreshed less than 24 hours ago is shown as stored.
        if (loaded.refreshedAt && Date.now() - Date.parse(loaded.refreshedAt) > DAY_MS) refresh();
      })
      .catch((failure: Error) => setError(failure.message));
  }, [refresh]);

  const add = useCallback(
    (cards: NewCard[], game: string, language: string) => {
      const holdings = [...latest.current.holdings];
      for (const item of cards) {
        const at = holdings.findIndex((holding) => holding.card.card_id === item.card.card_id);
        if (at >= 0) holdings[at] = { ...holdings[at], quantity: holdings[at].quantity + 1, price: item.price ?? holdings[at].price, history: item.history };
        else holdings.push({ ...item, game, language, quantity: 1 });
      }
      commit({ holdings, refreshedAt: latest.current.refreshedAt ?? new Date().toISOString() });
    },
    [commit],
  );

  /** Sets how many copies of a card are owned; zero removes it. */
  const setQuantity = useCallback(
    (cardId: number, quantity: number) => {
      const holdings = latest.current.holdings.map((holding) => (holding.card.card_id === cardId ? { ...holding, quantity } : holding)).filter((holding) => holding.quantity > 0);
      commit({ ...latest.current, holdings });
    },
    [commit],
  );

  return { holdings: stored.holdings, refreshedAt: stored.refreshedAt, refreshing, error, add, setQuantity, refresh };
}
