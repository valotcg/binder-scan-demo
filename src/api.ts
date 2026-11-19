import Constants from 'expo-constants';
import { File } from 'expo-file-system';

// Calls to Valo.Vision and Valo.Data, through the local proxy that holds the API key (see server/proxy.mjs).
// In development the proxy runs on the machine that serves the bundle, so its address is derived from the bundle host:
// the same code reaches it from the simulator (localhost) and from a real phone (the computer's LAN address).
const bundleHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
const PROXY = process.env.EXPO_PUBLIC_PROXY_URL ?? `http://${bundleHost}:8787`;

export interface Game {
  slug: string;
  name: string;
  languages: string[];
  vision: string;
}

export interface Card {
  card_id: number;
  name: string;
  number: string | null;
  image_url: string | null;
  edition: { name: string } | null;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageCard {
  index: number;
  status: 'matched' | 'ambiguous' | 'no_match' | 'rejected';
  detection: { box: Box };
  candidates: { card: Card }[];
}

export interface PageScan {
  cards: PageCard[];
  latency_ms: number;
}

export interface Price {
  amount: number;
  currency: string;
}

export interface HistoryPoint {
  date: string;
  amount: number;
}

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(PROXY + path, init);
  const body = await response.json();
  if (!response.ok) throw new ApiError(body?.error?.message ?? `HTTP ${response.status}`);
  return body as T;
}

/** Valo.Data: the games the API covers; the ones Valo.Vision can identify from a photo are kept. Costs no credit. */
export async function fetchGames(): Promise<Game[]> {
  const games = await request<{ items: Game[] }>('/data/v1/games');
  return games.items.filter((game) => game.vision === 'available');
}

/** Valo.Vision: one photo of a binder page in, every card on it identified among the prints of that game and language. */
export function scanPage(photoUri: string, game: string, language: string): Promise<PageScan> {
  const form = new FormData();
  form.append('image', new File(photoUri));
  form.append('game', game);
  form.append('language', language);
  return request('/vision/v1/scans/multi', { method: 'POST', body: form });
}

const COMPARE_MAX_IDS = 10;

/** Valo.Data: the recommended price of every card (the one the ValoTCG app shows, in EUR), 10 cards per call. */
export async function fetchPrices(cardIds: number[]): Promise<Map<number, Price>> {
  const unique = [...new Set(cardIds)];
  const chunks = Array.from({ length: Math.ceil(unique.length / COMPARE_MAX_IDS) }, (_, i) => unique.slice(i * COMPARE_MAX_IDS, (i + 1) * COMPARE_MAX_IDS));
  const responses = await Promise.all(
    chunks.map((ids) =>
      request<{ items: { id: string; summary?: { recommended: Price | null } }[] }>('/data/v1/analysis/compare', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids }),
      }),
    ),
  );
  const prices = new Map<number, Price>();
  for (const item of responses.flatMap((response) => response.items)) {
    if (item.summary?.recommended) prices.set(Number(item.id), item.summary.recommended);
  }
  return prices;
}

/** Valo.Data: daily Cardmarket price history of one card, over the range the plan allows. */
export async function fetchHistory(cardId: number): Promise<HistoryPoint[]> {
  const history = await request<{ points: { date: string; amount: number | null }[] }>(`/data/v1/cards/${cardId}/price-history?source=cardmarket`);
  return history.points.filter((point): point is HistoryPoint => point.amount !== null);
}
