import { FormEvent, useMemo, useState } from 'react';
import { Check, CreditCard as CardIcon, LayoutDashboard, SlidersHorizontal } from 'lucide-react';
import CategoryPicker from './CategoryPicker';
import BankLogo from './BankLogo';
import { CurrencyInput, fmt, parseMoney } from './shared';
import { saveCardPurchases, type Bank } from '../lib/bridge';
import { invoiceDate, type CreditCard } from '../lib/credit';
import { localDateKey } from '../lib/finance';
import { createPendingSaver, newCardPurchaseRows, pickSource, quickBankEntry, quickCardData, quickDraftAmount, type QuickInput, type QuickSource } from '../lib/quickEntry';

const SOURCE_KEY = 'fincore-pessoal.quick.source';
const UNIT_KEY = 'fincore-pessoal.quick.unit';
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* sem armazenamento: só não lembra */ } };
const ddmm = (date: string) => date.slice(5).split('-').reverse().join('/');
const monthName = (date: string) => new Date(`${date.slice(0, 7)}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

/** `amount` is undefined when the value field was left empty. */
export type QuickDraft = { source: QuickSource; input: QuickInput; amount: number | undefined };

export default function QuickEntry({ banks, cards, categories, units, createBankEntries, onCardSaved, onMoreDetails, onOpenApp }: {
 banks: Bank[];
 cards: CreditCard[];
 categories: { id: string; name: string; kind?: string; unit?: string }[];
 units: { name: string }[];
 /** Create-only: inserts these rows (ids already set); never edits an existing entry. */
 createBankEntries: (rows: (ReturnType<typeof quickBankEntry> & { id: string })[]) => Promise<void>;
 onCardSaved: () => Promise<void>;
 onMoreDetails: (draft: QuickDraft) => void;
 onOpenApp: () => void;
}) {
 const today = localDateKey(new Date());
 const [source, setSource] = useState<QuickSource | null>(() => pickSource(read(SOURCE_KEY), banks, cards));
 const [unit, setUnit] = useState(() => { const saved = read(UNIT_KEY); return units.some(u => u.name === saved) ? saved! : units[0]?.name ?? ''; });
 const [amount, setAmount] = useState(''), [category, setCategory] = useState(''), [description, setDescription] = useState('');
 const [date, setDate] = useState(today), [installments, setInstallments] = useState(1), [paid, setPaid] = useState(true);
 const [saving, setSaving] = useState(false), [error, setError] = useState(''), [done, setDone] = useState('');
 // Mesmo id em nova tentativa após falha: o upsert não duplica o lançamento.
 const [saver] = useState(createPendingSaver);

 // Fontes podem ter mudado desde a primeira renderização (dados chegando).
 const current = source && (source.type === 'bank' ? banks : cards).some(x => x.id === source.id) ? source : pickSource(read(SOURCE_KEY), banks, cards);
 const card = current?.type === 'card' ? cards.find(c => c.id === current.id) : undefined;
 const available = useMemo(() => categories.filter(c => c.kind === 'despesa' && c.unit === unit), [categories, unit]);
 const value = parseMoney(amount);
 const input: QuickInput = { amount: Number.isFinite(value) ? value : 0, category, description, date, unit, paid, installments: card ? installments : 1 };
 const due = card && /^\d{4}-\d{2}-\d{2}$/.test(date) ? invoiceDate(date, card, 0) : '';
 const ready = Boolean(current && amount !== '' && Number.isFinite(value) && category && unit && date);

 const choose = (next: QuickSource) => { setSource(next); setDone(''); };
 const submit = async (event: FormEvent) => {
  event.preventDefault();
  if (!ready || saving || !current) return;
  setSaving(true); setError(''); setDone('');
  try {
   if (card) {
    const data = quickCardData(input);
    await saver.run(JSON.stringify({ data, card: card.id }), () => newCardPurchaseRows(data, card), saveCardPurchases, onCardSaved);
   } else {
    const entry = quickBankEntry(input, current.id);
    await saver.run(JSON.stringify({ entry }), () => [{ ...entry, id: crypto.randomUUID() }], createBankEntries, async () => {});
   }
   write(SOURCE_KEY, `${current.type}:${current.id}`);
   write(UNIT_KEY, unit);
   setDone(`Lançado: ${fmt(input.amount)} em ${category}${card && installments > 1 ? ` (${installments}x)` : ''}.`);
   setAmount(''); setDescription(''); setInstallments(1);
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Não foi possível lançar.');
  } finally {
   setSaving(false);
  }
 };

 const chip = (active: boolean) => `flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${active ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700'}`;
 const field = 'mt-1.5 block w-full rounded-xl border bg-zinc-50 p-3 text-base font-normal';

 return (
  <div className="min-h-dvh bg-zinc-100 pb-10">
   <header className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
    <img src={`${import.meta.env.BASE_URL}fincore-pessoal-logo.svg`} alt="Fincore Pessoal" className="h-7" />
    <button type="button" onClick={onOpenApp} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-bold text-zinc-700 shadow-sm">
     <LayoutDashboard size={14} aria-hidden /> App completo
    </button>
   </header>

   <form onSubmit={submit} className="mx-4 mt-2 space-y-5 rounded-3xl bg-white p-5 shadow-sm">
    <h1 className="text-lg font-bold">Lançamento rápido</h1>

    {!current ? (
     <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
      Cadastre um banco ou cartão no <button type="button" onClick={onOpenApp} className="font-bold underline">app completo</button> para lançar por aqui.
     </p>
    ) : (<>
     <label className="block text-xs font-bold">
      Valor
      <CurrencyInput value={amount} onChange={v => { setAmount(v); setDone(''); }} className="!py-4 !text-2xl !font-bold" />
     </label>

     <fieldset>
      <legend className="text-xs font-bold">Onde pagou</legend>
      <div className="-mx-5 mt-1.5 flex gap-2 overflow-x-auto px-5 pb-1">
       {banks.map(b => (
        <button type="button" key={b.id} aria-pressed={current.type === 'bank' && current.id === b.id} onClick={() => choose({ type: 'bank', id: b.id })} className={chip(current.type === 'bank' && current.id === b.id)}>
         <BankLogo name={b.name} className="h-6 w-6 text-[10px]" /> {b.name}
        </button>
       ))}
       {cards.map(c => (
        <button type="button" key={c.id} aria-pressed={current.type === 'card' && current.id === c.id} onClick={() => choose({ type: 'card', id: c.id })} className={chip(current.type === 'card' && current.id === c.id)}>
         <CardIcon size={16} aria-hidden /> {c.name}
        </button>
       ))}
      </div>
     </fieldset>

     <label className="block text-xs font-bold">
      Categoria
      <CategoryPicker value={category} onChange={setCategory} options={available} />
     </label>

     <label className="block text-xs font-bold">
      Descrição <span className="font-normal text-zinc-500">(opcional)</span>
      <input value={description} onChange={e => setDescription(e.target.value)} placeholder={category || 'Ex.: almoço'} className={field} />
     </label>

     <div className="grid grid-cols-2 gap-3">
      <label className="block text-xs font-bold">
       {card ? 'Data da compra' : 'Data'}
       <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={field} />
      </label>
      {card ? (
       <label className="block text-xs font-bold">
        Parcelas
        <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className={field}>
         {Array.from({ length: 24 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}x{n > 1 && Number.isFinite(value) && value > 0 ? ` de ${fmt(value / n)}` : ''}</option>)}
        </select>
       </label>
      ) : (
       <label className="mt-6 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={paid} onChange={e => setPaid(e.target.checked)} className="h-5 w-5 accent-zinc-900" /> Já pago
       </label>
      )}
     </div>
     {due && <p className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600" aria-live="polite">Cai na fatura de {monthName(due)}, com vencimento em {ddmm(due)}.</p>}

     <label className="block text-xs font-bold">
      Centro de custo
      <select value={unit} onChange={e => { setUnit(e.target.value); setCategory(''); }} className={field}>
       {units.map(u => <option key={u.name}>{u.name}</option>)}
      </select>
     </label>

     {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
     {done && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><Check size={16} aria-hidden /> {done}</p>}

     <button type="submit" disabled={!ready || saving} className="w-full rounded-2xl bg-[#191918] py-4 text-base font-bold text-white shadow-[0_8px_20px_-10px_rgba(24,24,27,0.8)] disabled:opacity-40">
      {saving ? 'Lançando…' : 'Lançar'}
     </button>
     <button type="button" onClick={() => onMoreDetails({ source: current, input, amount: quickDraftAmount(amount) })} className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-zinc-600">
      <SlidersHorizontal size={14} aria-hidden /> Mais detalhes
     </button>
    </>)}
   </form>
  </div>
 );
}
