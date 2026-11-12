import { cardSchedule } from './cardLedger.ts';
import { defaultBankId } from './recurrence.ts';
import type { CreditCard } from './credit.ts';

/** What the mobile quick-entry screen collects. */
export type QuickInput = {
 amount: number;
 category: string;
 description: string;
 date: string;
 unit: string;
 /** Bank only: already paid on `date`. */
 paid: boolean;
 /** Card only: 1 to 24. */
 installments: number;
};
export type QuickSource = { type: 'bank' | 'card'; id: string };

const common = (input: QuickInput) => ({
 kind: 'despesa' as const,
 unit: input.unit,
 account: '',
 category: input.category,
 description: input.description.trim() || input.category,
 beneficiary: '',
 counterpartyId: null,
 pix: '',
 notes: '',
 attachments: [] as string[],
 amount: input.amount,
 date: input.date,
 recurrence: 'nenhuma' as const,
 juros: 0,
 discount: 0,
});

/** Bank expense in the same shape the full form hands to App's save. */
export function quickBankEntry(input: QuickInput, bankId: string) {
 return {
  ...common(input),
  installments: 1,
  bankId,
  status: input.paid ? 'realizado' as const : 'previsto' as const,
  paidDate: input.paid ? input.date : null,
 };
}

/** The `data` object cardSchedule expects for a new purchase. */
export function quickCardData(input: QuickInput) {
 return { ...common(input), installments: input.installments, status: 'previsto' as const };
}

/** Rows for a new card purchase, ready for saveCardPurchases. */
export function newCardPurchaseRows(data: any, card: CreditCard, parts?: { date: string; amount: string }[]) {
 const planned = cardSchedule(data, card, parts);
 const seriesId = planned.length > 1 || data.recurrence !== 'nenhuma' ? crypto.randomUUID() : undefined;
 return planned.map(e => ({ ...e, id: crypto.randomUUID(), seriesId }));
}

/** Remembered source ("bank:<id>" / "card:<id>") if it still exists, else a sensible default. */
export function pickSource(remembered: string | null, banks: { id: string; name: string }[], cards: { id: string }[]): QuickSource | null {
 const [type, id] = (remembered || '').split(':');
 if (type === 'bank' && banks.some(b => b.id === id)) return { type, id };
 if (type === 'card' && cards.some(c => c.id === id)) return { type, id };
 const bank = defaultBankId(banks) || banks[0]?.id;
 if (bank) return { type: 'bank', id: bank };
 return cards[0] ? { type: 'card', id: cards[0].id } : null;
}

/**
 * Keeps the rows of a save until persist AND the follow-up refresh succeed, so
 * tapping "Lançar" again after a failure upserts the same ids instead of
 * creating duplicates. A different `key` (the form changed) builds new rows.
 */
export function createPendingSaver() {
 let pending: { key: string; rows: any[] } | null = null;
 return {
  async run<T extends { id: string }>(key: string, build: () => T[], persist: (rows: T[]) => Promise<void>, after: () => Promise<void>) {
   if (pending?.key !== key) pending = { key, rows: build() };
   await persist(pending.rows as T[]);
   await after();
   pending = null;
  },
 };
}

/** "Mais detalhes": an empty field stays empty instead of becoming R$ 0,00. */
export function quickDraftAmount(raw: string): number | undefined {
 if (raw === '') return undefined;
 const value = Number(raw);
 return Number.isFinite(value) ? value : undefined;
}
