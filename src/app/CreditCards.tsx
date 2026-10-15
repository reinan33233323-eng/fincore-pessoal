import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { CreditCard as CardIcon, Plus } from 'lucide-react';
import { saveCreditCard, saveCardPurchases, payCreditInvoice, deleteCardPurchase, cancelCardSeries, signedAttachmentUrl, type Bank } from '../lib/bridge';
import { invoiceDate, invoiceCycle, invoiceMonthSummary, type CreditCard } from '../lib/credit';
import { cardSchedule } from '../lib/cardLedger';
import { addDays, defaultBankId, shiftWeeklyDate } from '../lib/recurrence';
import { addMonthsClamped, changedSeriesFields, seriesDueDate } from '../lib/seriesDates';
import { localDateKey, localMonthKey, entryValue } from '../lib/finance';
import { fmt } from './shared';

const field='mt-1 block w-full rounded-xl border bg-gray-50 p-2.5 text-sm font-normal';
const button='rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50';
type Props={cards:CreditCard[];setCards:(fn:(old:CreditCard[])=>CreditCard[])=>void;banks:Bank[];entries:any[];focus?:{cardId:string;month:string}|null;
 onRefresh:()=>Promise<void>;onPlans:()=>void;onEntries:(month:string)=>void;
 renderForm:(editing:any,save:(data:any,scope:'one'|'series',parts?:{date:string;amount:string}[])=>Promise<void>,close:()=>void,card:CreditCard)=>ReactNode};
export default function CreditCards({cards,setCards,banks,entries,onRefresh,onPlans,onEntries,renderForm,focus}:Props) {
 const today=localDateKey(new Date());
 const pendingSave=useRef<{key:string;rows:any[]}|null>(null);
 const [cardId,setCardId]=useState(focus?.cardId||cards[0]?.id||''),[month,setMonth]=useState(()=>focus?.month||(cards.find(c=>c.id===(focus?.cardId||cards[0]?.id))?invoiceDate(today,cards.find(c=>c.id===(focus?.cardId||cards[0]?.id))!).slice(0,7):localMonthKey(new Date())));
 const [followCurrentCycle,setFollowCurrentCycle]=useState(!focus?.month);
 const [name,setName]=useState(''),[closing,setClosing]=useState('25'),[due,setDue]=useState('5'),[editing,setEditing]=useState('');
 const [bank,setBank]=useState(defaultBankId(banks)||banks[0]?.id||''),[paymentDate,setPaymentDate]=useState(today);
 const [purchaseOpen,setPurchaseOpen]=useState(false),[editingPurchase,setEditingPurchase]=useState<any>(null);
 const [search,setSearch]=useState(''),[category,setCategory]=useState('Todas'),[center,setCenter]=useState('Todos'),[statusFilter,setStatusFilter]=useState('todos');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const card=cards.find(c=>c.id===cardId);
 const all=entries.filter(e=>e.creditCardId===cardId);
 const selectedSummary=invoiceMonthSummary(entries,cardId,month);
 const invoice=selectedSummary.items;
 const nextMonth=addMonthsClamped(`${month}-01`,1).slice(0,7);
 const nextSummary=invoiceMonthSummary(entries,cardId,nextMonth);
 const previousSummary=invoiceMonthSummary(entries,cardId,addMonthsClamped(`${month}-01`,-1).slice(0,7));
 const cycle=card?invoiceCycle(month,card):null;
 const dateLabel=(value:string)=>value.split('-').reverse().join('/');
 const monthLabel=(value:string)=>new Date(`${value}-01T12:00:00`).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
 const selectMonth=(value:string,follow=false)=>{setMonth(value);setFollowCurrentCycle(follow);setCategory('Todas');setCenter('Todos');setStatusFilter('todos');};
 const unpaid=invoice.filter(e=>e.status==='previsto');
 const total=selectedSummary.pending;
 useEffect(()=>{if(followCurrentCycle&&card){const current=invoiceDate(today,card).slice(0,7);if(month!==current){setMonth(current);setCategory('Todas');setCenter('Todos');setStatusFilter('todos');}}},[followCurrentCycle,card?.id,card?.closing_day,card?.due_day,today,month]);
 const categories=[...new Set(invoice.map(e=>e.category))].sort() as string[];
 const list=invoice.filter(e=>(category==='Todas'||e.category===category)&&(center==='Todos'||e.unit===center)&&(statusFilter==='todos'||e.status===statusFilter)&&`${e.description} ${e.beneficiary} ${e.category}`.toLowerCase().includes(search.toLowerCase()));
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setMessage('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}};
 const save=(e:FormEvent)=>{e.preventDefault();void run(async()=>{
 const saved=await saveCreditCard({id:editing||crypto.randomUUID(),name:name.trim(),closing_day:Number(closing),due_day:Number(due)});
 setCards(old=>[...old.filter(c=>c.id!==saved.id),saved].sort((a,b)=>a.name.localeCompare(b.name)));
 setCardId(saved.id);selectMonth(invoiceDate(today,saved).slice(0,7),true);setEditing('');setName('');setMessage('Cartão salvo.');
 });};
 const savePurchase=async(data:any,scope:'one'|'series',parts?:{date:string;amount:string}[])=>{
  if(!card)throw new Error('Selecione um cartão.');
  let rows:any[];
  if(editingPurchase){
   const selected=editingPurchase;
   const occurrences=scope==='series'&&selected.seriesId?all.filter(e=>e.seriesId===selected.seriesId&&e.status==='previsto'):all.filter(e=>e.id===selected.id&&e.status==='previsto');
   if(!occurrences.length)throw new Error('Compras de faturas já pagas são preservadas.');
   const changes=scope==='series'?changedSeriesFields({...selected,date:selected.cardPurchaseDate||selected.date},data,['date']):data;
   const dates=occurrences.map(e=>({...e,date:e.cardPurchaseDate||e.date}));
   rows=occurrences.map(e=>{
    const originalDate=e.cardPurchaseDate||e.date;
    const dateChanged=data.date!==(selected.cardPurchaseDate||selected.date);
    const purchaseDate=!dateChanged?originalDate:scope==='series'&&e.recurrence==='mensal'?seriesDueDate(dates,{...selected,date:selected.cardPurchaseDate||selected.date},{...e,date:originalDate},data.date):scope==='series'&&e.recurrence==='semanal'?shiftWeeklyDate(originalDate,selected.cardPurchaseDate||selected.date,data.date):data.date;
    const date=dateChanged?invoiceDate(purchaseDate,card,e.cardInstallmentOffset||0):e.date;
    return {...e,...changes,id:e.id,seriesId:e.seriesId,installment:e.installment,installments:1,recurrence:e.recurrence,cardPurchaseDate:purchaseDate,
     cardInstallmentOffset:e.cardInstallmentOffset||0,date,invoiceMonth:date.slice(0,7),creditCardId:card.id,kind:'despesa',status:'previsto',bankId:null,paidDate:null,juros:0,discount:0};
   });
  }else{
   const key=JSON.stringify({data,parts,cardId:card.id});
   if(pendingSave.current?.key===key)rows=pendingSave.current.rows;
   else {
    const planned=cardSchedule(data,card,parts);
    const seriesId=planned.length>1||data.recurrence!=='nenhuma'?crypto.randomUUID():undefined;
    rows=planned.map(e=>({...e,id:crypto.randomUUID(),seriesId}));
    pendingSave.current={key,rows};
   }
  }
  await saveCardPurchases(rows);await onRefresh();pendingSave.current=null;selectMonth(rows[0].invoiceMonth);setCategory('Todas');setSearch('');setMessage('Lançamentos salvos no cartão. A lista geral mostra o total da fatura.');
 };
 const pay=()=>void run(async()=>{
 if(!card||!bank||!unpaid.length)throw new Error('Selecione uma fatura em aberto e a conta bancária.');
 await payCreditInvoice(card.id,month,bank,paymentDate);await onRefresh();setMessage('Pagamento registrado. O saldo da conta já foi atualizado.');
 });
 const remove=(entry:any)=>void run(async()=>{if(!window.confirm('Excluir somente esta compra/parcela em aberto?'))return;await deleteCardPurchase(entry.id);await onRefresh();});
 const cancel=(entry:any)=>void run(async()=>{if(!window.confirm('Cancelar esta série no cartão e excluir suas ocorrências em aberto? Compras já pagas serão mantidas.'))return;await cancelCardSeries(entry.seriesId);await onRefresh();});
 return <div className="space-y-5">
 <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-extrabold">Cartões de crédito</h2><p className="mt-1 text-xs text-slate-500">Lance compras, assinaturas e parcelamentos nesta área. Em Lançamentos aparece somente o total de cada fatura.</p>
 <form onSubmit={save} className="mt-4 grid items-end gap-3 sm:grid-cols-4"><label className="text-xs font-bold">Nome do cartão<input className={field} required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} /></label>
 <label className="text-xs font-bold">Dia de fechamento<input className={field} type="number" min={1} max={31} required value={closing} onChange={e=>setClosing(e.target.value)}/></label>
 <label className="text-xs font-bold">Dia de vencimento<input className={field} type="number" min={1} max={31} required value={due} onChange={e=>setDue(e.target.value)}/></label>
 <div className="flex gap-2"><button disabled={busy} className={button}>{editing?'Salvar cartão':'Cadastrar cartão'}</button>{editing&&<button type="button" onClick={()=>{setEditing('');setName('');}}>Cancelar</button>}</div></form></section>
 {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}{message&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
 {!!cards.length&&<section className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-end gap-4"><label className="text-xs font-bold">Cartão<select className={field} value={cardId} onChange={e=>{setCardId(e.target.value);const selected=cards.find(c=>c.id===e.target.value);if(selected)selectMonth(invoiceDate(today,selected).slice(0,7),true);}}>{cards.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="text-xs font-bold">Mês de vencimento da fatura<input className={field} type="month" required value={month} onChange={e=>{if(e.target.value)selectMonth(e.target.value);}}/></label>
 <button type="button" className={button} disabled={!card} onClick={()=>{pendingSave.current=null;setEditingPurchase(null);setPurchaseOpen(true);}}><Plus className="mr-1 inline h-4 w-4"/>Novo lançamento no cartão</button><button type="button" className="text-xs font-bold text-brand-700" onClick={()=>onEntries(month)}>Ver esta fatura em Lançamentos</button><button type="button" className="text-xs font-bold text-brand-700" onClick={onPlans}>Gerenciar planos de contas e centros</button>
 {card&&<button type="button" className="text-xs font-bold" onClick={()=>{setEditing(card.id);setName(card.name);setClosing(String(card.closing_day));setDue(String(card.due_day));}}>Editar cartão</button>}</div>
 <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={()=>selectMonth(addMonthsClamped(`${month}-01`,-1).slice(0,7))} className="rounded-xl border px-3 py-2 text-xs font-bold">← Fatura anterior</button><button type="button" onClick={()=>{if(card)selectMonth(invoiceDate(today,card).slice(0,7),true);}} className="rounded-xl border px-3 py-2 text-xs font-bold">Ciclo atual</button><button type="button" onClick={()=>selectMonth(nextMonth)} className="rounded-xl border px-3 py-2 text-xs font-bold">Próxima fatura →</button></div>
 {cycle&&<div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm"><b>{today<cycle.start?'Fatura futura (previsão)':today>=cycle.closing?'Fatura fechada':'Ciclo em andamento'} · {monthLabel(month)}</b><p className="mt-1 text-xs">Compras de {dateLabel(cycle.start)} até {dateLabel(addDays(cycle.closing,-1))} · Fechamento {dateLabel(cycle.closing)} · Vencimento {dateLabel(cycle.due)}</p><p className="mt-1 text-xs">Compras no dia do fechamento entram na fatura seguinte. Cada assinatura contribui somente com a mensalidade deste ciclo.</p></div>}
 <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-950 p-4 text-white"><CardIcon className="mb-3 h-6 w-6"/><p className="text-xs">Total desta fatura</p><b className="text-2xl">{fmt(selectedSummary.total)}</b><p className="mt-2 text-xs">Em aberto: {fmt(total)}</p></div><div className="rounded-xl border p-4"><p className="text-xs text-slate-500">Pago nesta fatura</p><b className="text-xl">{fmt(selectedSummary.paid)}</b></div><div className="rounded-xl border p-4"><p className="text-xs text-slate-500">Próxima fatura prevista · {monthLabel(nextMonth)}</p><b className="text-xl">{fmt(nextSummary.total)}</b><p className="mt-2 text-xs text-slate-500">Cada fatura mostra somente as compras do seu ciclo.</p></div></div>
 <p className="mt-3 text-xs text-slate-500">Fatura anterior: {fmt(previousSummary.total)} · Diferença neste mês: {fmt(Math.round((selectedSummary.total-previousSummary.total)*100)/100)}. Os valores de meses diferentes não são somados nesta fatura.</p>
 <div className="mt-5 flex flex-wrap gap-3"><input aria-label="Buscar compras do cartão" placeholder="Buscar compra, assinatura ou fornecedor" value={search} onChange={e=>setSearch(e.target.value)} className="w-80 rounded-xl border p-2.5 text-sm"/><label className="text-xs font-bold">Plano de contas<select className={field} value={category} onChange={e=>setCategory(e.target.value)}><option>Todas</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="text-xs font-bold">Centro de custo<select className={field} value={center} onChange={e=>setCenter(e.target.value)}><option>Todos</option>{[...new Set(invoice.map(e=>e.unit))].map(u=><option key={String(u)}>{String(u)}</option>)}</select></label><label className="text-xs font-bold">Situação<select className={field} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="todos">Todas</option><option value="previsto">Em aberto</option><option value="realizado">Pagas</option></select></label></div>
 <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="p-3">Compra / assinatura</th><th>Plano / centro</th><th>Data da compra / cobrança</th><th>Valor</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{list.map(e=><tr key={e.id} className="border-b align-top"><td className="p-3"><b>{e.description}</b><p className="mt-1 text-xs text-slate-500">{e.recurrence!=='nenhuma'?`Recorrente ${e.recurrence}`:e.installment?`Parcela ${e.installment}`:'Compra única'}{e.beneficiary?` · ${e.beneficiary}`:''}</p>{e.notes&&<p className="mt-1 text-xs text-slate-500">{e.notes}</p>}{e.attachments?.map((path:string,i:number)=><button key={path} type="button" className="mr-2 mt-2 text-xs font-bold text-brand-700" onClick={()=>void run(async()=>{window.open(await signedAttachmentUrl(path),'_blank','noopener');})}>Anexo {i+1}</button>)}</td><td className="py-3">{e.category}<p className="text-xs text-slate-500">{e.unit}</p></td><td className="py-3">{e.cardPurchaseDate ? dateLabel(e.cardPurchaseDate) : 'Data não informada'}<p className="mt-1 text-xs text-slate-500">Vencimento da fatura: {dateLabel(e.date)}</p></td><td className="py-3">{fmt(entryValue(e))}</td><td className="py-3">{e.status==='realizado'?'Paga':'Em aberto'}</td><td className="py-3">{e.status==='previsto'&&<div className="flex flex-col items-start gap-2"><button disabled={busy} className="text-xs font-bold text-brand-700" onClick={()=>{setEditingPurchase(e);setPurchaseOpen(true);}}>Editar</button><button disabled={busy} className="text-xs text-red-600" onClick={()=>remove(e)}>Excluir esta</button></div>}{e.seriesId&&(e.recurrence!=='nenhuma'||e.status==='previsto')&&<button disabled={busy} className="text-xs text-red-600" onClick={()=>cancel(e)}>{e.recurrence!=='nenhuma'?'Cancelar recorrência':'Excluir parcelas futuras'}</button>}</td></tr>)}</tbody></table>{!list.length&&<p className="py-6 text-sm text-slate-500">Nenhum lançamento para esta fatura e filtros.</p>}</div>
 <div className="mt-4 flex flex-wrap gap-2">{categories.map(c=><span key={c} className="rounded-lg bg-slate-100 px-3 py-2 text-xs"><b>{c}:</b> {fmt(invoice.filter(e=>e.category===c).reduce((s,e)=>s+entryValue(e),0))}</span>)}</div>
 <div className="mt-5 flex flex-wrap items-end gap-3"><label className="text-xs font-bold">Conta para pagamento<select className={field} value={bank} onChange={e=>setBank(e.target.value)}><option value="">Selecione</option>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="text-xs font-bold">Data do pagamento<input className={field} type="date" max={today} required value={paymentDate} onChange={e=>setPaymentDate(e.target.value)}/></label><button type="button" disabled={busy||!total||!bank||!paymentDate} className={button} onClick={()=>{if(window.confirm(`Registrar pagamento de ${fmt(total)} pela conta ${banks.find(b=>b.id===bank)?.name}?`))pay();}}>Registrar pagamento da fatura</button></div><p className="mt-2 text-xs text-slate-500">Use após pagar no banco. O valor em aberto será debitado uma única vez da conta escolhida.</p></section>}
 {purchaseOpen&&card&&renderForm(editingPurchase?{...editingPurchase,date:editingPurchase.cardPurchaseDate||editingPurchase.date}:null,savePurchase,()=>{setPurchaseOpen(false);setEditingPurchase(null);},card)}
 </div>;
}
