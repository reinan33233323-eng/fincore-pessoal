import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import CreditInvoiceView from './CreditInvoiceView';
import { saveCreditCard, saveCardPurchases, payCreditInvoice, deleteCardPurchase, cancelCardSeries, signedAttachmentUrl, type Bank } from '../lib/bridge';
import { invoiceDate, invoiceCycle, invoiceMonthSummary, type CreditCard } from '../lib/credit';
import { cardSchedule } from '../lib/cardLedger';
import { addDays, defaultBankId, shiftWeeklyDate } from '../lib/recurrence';
import { addMonthsClamped, changedSeriesFields, seriesDueDate } from '../lib/seriesDates';
import { localDateKey, localMonthKey } from '../lib/finance';
import { fmt } from './shared';

const field='mt-1 block w-full rounded-xl border bg-zinc-50 p-2.5 text-sm font-normal';
const button='rounded-full bg-[#191918] px-4 py-2.5 hover:bg-black shadow-[0_8px_20px_-10px_rgba(24,24,27,0.8)] text-sm font-bold text-white disabled:opacity-50';
type Props={categories?:any[];cards:CreditCard[];setCards:(fn:(old:CreditCard[])=>CreditCard[])=>void;banks:Bank[];entries:any[];focus?:{cardId:string;month:string}|null;
 onRefresh:()=>Promise<void>;onPlans:()=>void;onEntries:(month:string)=>void;
 renderForm:(editing:any,save:(data:any,scope:'one'|'series',parts?:{date:string;amount:string}[])=>Promise<void>,close:()=>void,card:CreditCard)=>ReactNode};
export default function CreditCards({cards,setCards,banks,entries,onRefresh,onPlans,onEntries,renderForm,focus,categories:categoryDefinitions=[]}:Props) {
 const today=localDateKey(new Date());
 const pendingSave=useRef<{key:string;rows:any[]}|null>(null);
 const [cardId,setCardId]=useState(focus?.cardId||cards[0]?.id||''),[month,setMonth]=useState(()=>focus?.month||(cards.find(c=>c.id===(focus?.cardId||cards[0]?.id))?invoiceDate(today,cards.find(c=>c.id===(focus?.cardId||cards[0]?.id))!).slice(0,7):localMonthKey(new Date())));
 const [followCurrentCycle,setFollowCurrentCycle]=useState(!focus?.month);
 const [name,setName]=useState(''),[closing,setClosing]=useState('25'),[due,setDue]=useState('5'),[editing,setEditing]=useState('');
 const [bank,setBank]=useState(defaultBankId(banks)||banks[0]?.id||''),[paymentDate,setPaymentDate]=useState(today);
 const [purchaseOpen,setPurchaseOpen]=useState(false),[editingPurchase,setEditingPurchase]=useState<any>(null);
 const [search,setSearch]=useState(''),[category,setCategory]=useState('Todas'),[center,setCenter]=useState('Todos'),[statusFilter,setStatusFilter]=useState('todos');
 const [cardFormOpen,setCardFormOpen]=useState(!cards.length),[paymentOpen,setPaymentOpen]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const card=cards.find(c=>c.id===cardId);
 const all=entries.filter(e=>e.creditCardId===cardId);
 const selectedSummary=invoiceMonthSummary(entries,cardId,month);
 const invoice=selectedSummary.items;
 const nextMonth=addMonthsClamped(`${month}-01`,1).slice(0,7);
 const nextSummary=invoiceMonthSummary(entries,cardId,nextMonth);
 const cycle=card?invoiceCycle(month,card):null;
 const monthLabel=(value:string)=>new Date(`${value}-01T12:00:00`).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
 const selectMonth=(value:string,follow=false)=>{setMonth(value);setFollowCurrentCycle(follow);setCategory('Todas');setCenter('Todos');setStatusFilter('todos');};
 const unpaid=invoice.filter(e=>e.status==='previsto');
 const total=selectedSummary.pending;
 useEffect(()=>{if(followCurrentCycle&&card){const current=invoiceDate(today,card).slice(0,7);if(month!==current){setMonth(current);setCategory('Todas');setCenter('Todos');setStatusFilter('todos');}}},[followCurrentCycle,card?.id,card?.closing_day,card?.due_day,today,month]);
 const list=invoice.filter(e=>(category==='Todas'||e.category===category)&&(center==='Todos'||e.unit===center)&&(statusFilter==='todos'||e.status===statusFilter)&&`${e.description} ${e.beneficiary} ${e.category}`.toLowerCase().includes(search.toLowerCase()));
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setMessage('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}};
 const save=(e:FormEvent)=>{e.preventDefault();void run(async()=>{
 const saved=await saveCreditCard({id:editing||crypto.randomUUID(),name:name.trim(),closing_day:Number(closing),due_day:Number(due)});
 setCards(old=>[...old.filter(c=>c.id!==saved.id),saved].sort((a,b)=>a.name.localeCompare(b.name)));
 setCardId(saved.id);selectMonth(invoiceDate(today,saved).slice(0,7),true);setEditing('');setName('');setCardFormOpen(false);setMessage('Cartão salvo.');
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
  await saveCardPurchases(rows);await onRefresh();pendingSave.current=null;
  // Series rows arrive newest first. Editing must keep the invoice and filters
  // the user opened, rather than navigate to the last generated occurrence.
  if(!editingPurchase){selectMonth(rows[0].invoiceMonth);setSearch('');}
  setMessage('Lançamentos salvos no cartão. A lista geral mostra o total da fatura.');
 };
 const pay=()=>void run(async()=>{
 if(!card||!bank||!unpaid.length)throw new Error('Selecione uma fatura em aberto e a conta bancária.');
 await payCreditInvoice(card.id,month,bank,paymentDate);await onRefresh();setPaymentOpen(false);setMessage('Pagamento registrado. O saldo da conta já foi atualizado.');
 });
 const remove=(entry:any)=>void run(async()=>{if(!window.confirm('Excluir somente esta compra/parcela em aberto?'))return;await deleteCardPurchase(entry.id);await onRefresh();});
 const cancel=(entry:any)=>void run(async()=>{if(!window.confirm('Cancelar esta série no cartão e excluir suas ocorrências em aberto? Compras já pagas serão mantidas.'))return;await cancelCardSeries(entry.seriesId);await onRefresh();});
 const newCard=()=>{setEditing('');setName('');setClosing('25');setDue('5');setCardFormOpen(true);};
 const editCard=()=>{if(card){setEditing(card.id);setName(card.name);setClosing(String(card.closing_day));setDue(String(card.due_day));setCardFormOpen(true);}};
 return <div className="space-y-4">
 {error&&<p role="alert" className="mx-auto max-w-[920px] rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}{message&&<p role="status" className="mx-auto max-w-[920px] rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
 {card&&cycle?<CreditInvoiceView cards={cards} cardId={cardId} month={month} cycle={cycle} today={today}
   total={selectedSummary.total} paid={selectedSummary.paid} pending={total} nextTotal={nextSummary.total} invoice={invoice} rows={list} categories={categoryDefinitions} banks={banks}
   search={search} setSearch={setSearch} category={category} setCategory={setCategory} center={center} setCenter={setCenter} status={statusFilter} setStatus={setStatusFilter}
   selectCard={value=>{setCardId(value);const selected=cards.find(c=>c.id===value);if(selected)selectMonth(invoiceDate(today,selected).slice(0,7),true);}}
   selectMonth={selectMonth} previous={()=>selectMonth(addMonthsClamped(`${month}-01`,-1).slice(0,7))} next={()=>selectMonth(nextMonth)} current={()=>selectMonth(invoiceDate(today,card).slice(0,7),true)}
   add={()=>{pendingSave.current=null;setEditingPurchase(null);setPurchaseOpen(true);}} edit={entry=>{setEditingPurchase(entry);setPurchaseOpen(true);}} remove={remove} cancel={cancel}
   attachment={path=>void run(async()=>{window.open(await signedAttachmentUrl(path),'_blank','noopener');})}
   editCard={editCard} addCard={newCard} plans={onPlans} entries={()=>onEntries(month)} pay={()=>setPaymentOpen(true)} busy={busy}
 />:<section className="mx-auto max-w-[920px] rounded-2xl bg-[#ffffff] p-8 text-center"><h2 className="font-bold">Seus cartões de crédito</h2><p className="mt-2 text-sm text-zinc-500">Cadastre um cartão para lançar compras, assinaturas e parcelamentos.</p><button onClick={newCard} className={`${button} mt-5`}>Cadastrar cartão</button></section>}
 {cardFormOpen&&<div className="fc-overlay fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"><section role="dialog" aria-modal="true" aria-label={editing?'Editar cartão':'Cadastrar cartão'} className="w-full max-w-lg rounded-2xl bg-[#ffffff] p-6 shadow-xl"><header className="flex items-center justify-between"><h2 className="font-bold">{editing?'Editar cartão':'Cadastrar cartão'}</h2><button aria-label="Fechar cadastro de cartão" onClick={()=>setCardFormOpen(false)}><X size={20}/></button></header><form onSubmit={save} className="mt-5 space-y-4"><label className="block text-xs font-bold">Nome do cartão<input className={field} required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Dia de fechamento<input className={field} type="number" min={1} max={31} required value={closing} onChange={e=>setClosing(e.target.value)}/></label><label className="text-xs font-bold">Dia de vencimento<input className={field} type="number" min={1} max={31} required value={due} onChange={e=>setDue(e.target.value)}/></label></div>{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={()=>setCardFormOpen(false)} className="text-sm">Cancelar</button><button disabled={busy} className={button}>{busy?'Salvando…':'Salvar cartão'}</button></div></form></section></div>}
 {paymentOpen&&card&&<div className="fc-overlay fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"><section role="dialog" aria-modal="true" aria-label="Registrar pagamento da fatura" className="w-full max-w-lg rounded-2xl bg-[#ffffff] p-6 shadow-xl"><header className="flex items-center justify-between"><h2 className="font-bold">Registrar pagamento da fatura</h2><button aria-label="Fechar pagamento da fatura" onClick={()=>setPaymentOpen(false)}><X size={20}/></button></header><p className="mt-4 text-sm text-zinc-500">{card.name} · {monthLabel(month)}</p><p className="mt-2 text-2xl font-bold">{fmt(total)}</p><p className="mt-3 text-xs leading-relaxed text-zinc-500">Use após pagar no banco. O valor em aberto será debitado uma única vez da conta escolhida.</p><form className="mt-5 space-y-4" onSubmit={e=>{e.preventDefault();if(window.confirm(`Registrar pagamento de ${fmt(total)} pela conta ${banks.find(b=>b.id===bank)?.name}?`))pay();}}><label className="block text-xs font-bold">Conta para pagamento<select required className={field} value={bank} onChange={e=>setBank(e.target.value)}><option value="">Selecione</option>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="block text-xs font-bold">Data do pagamento<input className={field} type="date" max={today} required value={paymentDate} onChange={e=>setPaymentDate(e.target.value)}/></label>{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={()=>setPaymentOpen(false)} className="text-sm">Cancelar</button><button disabled={busy||!total||!bank||!paymentDate} className={button}>{busy?'Registrando…':'Registrar pagamento'}</button></div></form></section></div>}
 {purchaseOpen&&card&&renderForm(editingPurchase?{...editingPurchase,date:editingPurchase.cardPurchaseDate||editingPurchase.date}:null,savePurchase,()=>{setPurchaseOpen(false);setEditingPurchase(null);},card)}
 </div>;
}
