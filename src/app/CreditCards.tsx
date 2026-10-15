import { FormEvent, useState } from 'react';
import { CreditCard as CardIcon } from 'lucide-react';
import { saveCreditCard, saveRemoteEntries, payCreditInvoice, deleteRemoteEntries, type Bank } from '../lib/bridge';
import { invoiceDate, installmentAmounts, type CreditCard } from '../lib/credit';
import { localDateKey, localMonthKey, type FinancialEntry } from '../lib/finance';
import { defaultBankId } from '../lib/recurrence';
import { fmt, CurrencyInput, parseMoney } from './shared';

type CardEntry = FinancialEntry & {id:string;creditCardId?:string|null;invoiceMonth?:string|null;description:string;installment?:string};
const field='mt-1 block w-full rounded-xl border bg-gray-50 p-2.5 text-sm font-normal';
const button='rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50';
export default function CreditCards({cards,setCards,banks,entries,centers,categories,onRefresh}:{cards:CreditCard[];setCards:(fn:(old:CreditCard[])=>CreditCard[])=>void;banks:Bank[];entries:CardEntry[];centers:{name:string}[];categories:{name:string;unit:string;kind:string}[];onRefresh:()=>Promise<void>}) {
 const today=localDateKey(new Date());
 const [cardId,setCardId]=useState(cards[0]?.id||''),[month,setMonth]=useState(localMonthKey(new Date()));
 const [name,setName]=useState(''),[closing,setClosing]=useState('25'),[due,setDue]=useState('5'),[editing,setEditing]=useState('');
 const [description,setDescription]=useState(''),[amount,setAmount]=useState(''),[purchaseDate,setPurchaseDate]=useState(today),[parts,setParts]=useState('1');
 const [unit,setUnit]=useState(centers[0]?.name||''),[category,setCategory]=useState(''),[bank,setBank]=useState(defaultBankId(banks)||banks[0]?.id||''),[paymentDate,setPaymentDate]=useState(today);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const card=cards.find(c=>c.id===cardId);
 const invoice=entries.filter(e=>e.creditCardId===cardId&&e.invoiceMonth===month);
 const unpaid=invoice.filter(e=>e.status==='previsto');
 const total=unpaid.reduce((s,e)=>s+Math.round(e.amount*100),0)/100;
 const debt=entries.filter(e=>e.creditCardId===cardId&&e.status==='previsto').reduce((s,e)=>s+Math.round(e.amount*100),0)/100;
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setMessage('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}};
 const save=(e:FormEvent)=>{e.preventDefault();void run(async()=>{
 const saved=await saveCreditCard({id:editing||crypto.randomUUID(),name:name.trim(),closing_day:Number(closing),due_day:Number(due)});
 setCards(old=>[...old.filter(c=>c.id!==saved.id),saved].sort((a,b)=>a.name.localeCompare(b.name)));
 setCardId(saved.id);setEditing('');setName('');setMessage('Cartão salvo.');
 });};
 const purchase=(e:FormEvent)=>{e.preventDefault();void run(async()=>{
 if(!card||!unit||!category||!description.trim())throw new Error('Preencha cartão, descrição, centro e plano de contas.');
 const values=installmentAmounts(parseMoney(amount),Number(parts));
 if(!Number.isFinite(parseMoney(amount))||parseMoney(amount)<=0)throw new Error('Informe um valor válido.');
 const series=values.length>1?crypto.randomUUID():undefined;
 await saveRemoteEntries(values.map((value,i)=>{const date=invoiceDate(purchaseDate,card,i);return {
 id:crypto.randomUUID(),seriesId:series,kind:'despesa',status:'previsto',amount:value,date,unit,category,account:card.name,
 description:description.trim(),beneficiary:'',pix:'',recurrence:'nenhuma',installments:values.length,installment:`${i+1}/${values.length}`,
 bankId:null,creditCardId:card.id,invoiceMonth:date.slice(0,7),notes:`Compra em ${purchaseDate} · ${card.name}`};}));
 setMonth(invoiceDate(purchaseDate,card).slice(0,7));await onRefresh();setDescription('');setAmount('');setMessage('Compra registrada nas faturas e no fluxo previsto.');
 });};
 const pay=()=>void run(async()=>{
 if(!card||!bank||!unpaid.length)throw new Error('Selecione uma fatura em aberto e a conta bancária.');
 await payCreditInvoice(card.id,month,bank,paymentDate);await onRefresh();setMessage('Pagamento registrado. O saldo da conta já foi atualizado.');
 });
 return <div className="space-y-5">
 <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-extrabold">Cartões de crédito</h2><p className="mt-1 text-xs text-slate-500">Compras entram como despesas previstas. Ao registrar o pagamento da fatura, o valor sai da conta escolhida uma única vez.</p>
 <form onSubmit={save} className="mt-4 grid items-end gap-3 sm:grid-cols-4"><label className="text-xs font-bold">Nome do cartão<input className={field} required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} /></label>
 <label className="text-xs font-bold">Dia de fechamento<input className={field} type="number" min={1} max={31} required value={closing} onChange={e=>setClosing(e.target.value)}/></label>
 <label className="text-xs font-bold">Dia de vencimento<input className={field} type="number" min={1} max={31} required value={due} onChange={e=>setDue(e.target.value)}/></label>
 <div className="flex gap-2"><button disabled={busy} className={button}>{editing?'Salvar cartão':'Cadastrar cartão'}</button>{editing&&<button type="button" onClick={()=>{setEditing('');setName('');}}>Cancelar</button>}</div></form></section>
 {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}{message&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
 {!!cards.length&&<><section className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-end gap-4"><label className="text-xs font-bold">Cartão<select className={field} value={cardId} onChange={e=>setCardId(e.target.value)}>{cards.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="text-xs font-bold">Mês de vencimento da fatura<input className={field} type="month" required value={month} onChange={e=>setMonth(e.target.value)}/></label>{card&&<button type="button" className="text-xs font-bold" onClick={()=>{setEditing(card.id);setName(card.name);setClosing(String(card.closing_day));setDue(String(card.due_day));}}>Editar cartão</button>}</div>
 <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-950 p-4 text-white"><CardIcon className="mb-3 h-6 w-6"/><p className="text-xs">Fatura em aberto</p><b className="text-2xl">{fmt(total)}</b></div><div className="rounded-xl border p-4"><p className="text-xs text-slate-500">Pago nesta fatura</p><b className="text-xl">{fmt(invoice.filter(e=>e.status==='realizado').reduce((s,e)=>s+e.amount,0))}</b></div><div className="rounded-xl border p-4"><p className="text-xs text-slate-500">Total em aberto em todas as faturas</p><b className="text-xl">{fmt(debt)}</b></div></div>
 <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="p-3">Compra / parcela</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th/></tr></thead><tbody>{invoice.map(e=><tr key={e.id} className="border-b"><td className="p-3">{e.description} · {e.installment}</td><td>{e.date.split('-').reverse().join('/')}</td><td>{fmt(e.amount)}</td><td>{e.status==='realizado'?'Paga':'Em aberto'}</td><td>{e.status==='previsto'&&<button disabled={busy} className="text-xs text-red-600" onClick={()=>{if(window.confirm('Excluir somente esta parcela em aberto?'))void run(async()=>{await deleteRemoteEntries([e.id]);await onRefresh();});}}>Excluir parcela</button>}</td></tr>)}</tbody></table>{!invoice.length&&<p className="py-6 text-sm text-slate-500">Nenhuma compra nesta fatura.</p>}</div>
 <div className="mt-5 flex flex-wrap items-end gap-3"><label className="text-xs font-bold">Conta para pagamento<select className={field} value={bank} onChange={e=>setBank(e.target.value)}><option value="">Selecione</option>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="text-xs font-bold">Data do pagamento<input className={field} type="date" max={today} required value={paymentDate} onChange={e=>setPaymentDate(e.target.value)}/></label><button type="button" disabled={busy||!total||!bank||!paymentDate} className={button} onClick={()=>{if(window.confirm(`Registrar pagamento de ${fmt(total)} pela conta ${banks.find(b=>b.id===bank)?.name}?`))pay();}}>Registrar pagamento da fatura</button></div><p className="mt-2 text-xs text-slate-500">Use após pagar no banco. Este registro atualiza seu controle financeiro.</p></section>
 <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-extrabold">Nova compra</h2><p className="mt-1 text-xs text-slate-500">Compras no dia do fechamento vão para a próxima fatura. Datas 29–31 são ajustadas ao último dia do mês.</p><form onSubmit={purchase} className="mt-4 grid gap-4 sm:grid-cols-3"><label className="text-xs font-bold">Descrição<input required className={field} value={description} onChange={e=>setDescription(e.target.value)}/></label><label className="text-xs font-bold">Valor total<CurrencyInput value={amount} onChange={setAmount}/></label><label className="text-xs font-bold">Data da compra<input type="date" required max={today} className={field} value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)}/></label><label className="text-xs font-bold">Parcelas<input type="number" required min={1} className={field} value={parts} onChange={e=>setParts(e.target.value)}/></label><label className="text-xs font-bold">Centro de custo<select required className={field} value={unit} onChange={e=>{setUnit(e.target.value);setCategory('');}}><option value="">Selecione</option>{centers.map(c=><option key={c.name}>{c.name}</option>)}</select></label><label className="text-xs font-bold">Plano de contas<select required className={field} value={category} onChange={e=>setCategory(e.target.value)}><option value="">Selecione</option>{categories.filter(c=>c.kind==='despesa'&&c.unit===unit).map(c=><option key={c.name}>{c.name}</option>)}</select></label><div><button disabled={busy||!card} className={button}>Lançar compra</button></div></form>{!centers.length&&<p className="mt-3 text-xs text-amber-800">Cadastre um centro de custo e um plano de despesa para classificar as compras.</p>}</section></>}
 </div>;
}
