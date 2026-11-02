import { entryValue, reportingDate } from '../lib/finance';
import { fmt } from './shared';

export default function ControlCardSpending({entries,cards}:{entries:any[];cards:{id:string;name:string;include_in_balance?:boolean}[]}) {
 const groups=cards.filter(card=>card.include_in_balance===false).map(card=>({card,rows:entries.filter(e=>e.creditCardId===card.id&&!e.cardPayment&&!e.invoiceAdjustment)}));
 if(!groups.length)return null;
 const total=groups.flatMap(group=>group.rows).reduce((sum,e)=>sum+Math.round(entryValue(e)*100),0)/100;
 return <section aria-label="Cartões somente para controle" className="fc-card p-6">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="fc-h">Cartões somente para controle</h3><p className="fc-sub mt-1">Gastos do período separados dos demais totais. Não descontam do saldo das contas nem entram no fluxo de caixa.</p></div><b className="text-xl font-semibold text-violet-700">{fmt(total)}</b></div>
  <div className="mt-4 divide-y divide-zinc-100">{groups.map(({card,rows})=><details key={card.id} className="py-3"><summary className="flex cursor-pointer items-center justify-between gap-3 text-sm"><span className="font-medium">{card.name}<span className="ml-2 text-xs text-zinc-500">{rows.length} compra(s)</span></span><b>{fmt(rows.reduce((sum,e)=>sum+Math.round(entryValue(e)*100),0)/100)}</b></summary><div className="mt-3 space-y-2">{[...rows].sort((a,b)=>reportingDate(b).localeCompare(reportingDate(a))).map(e=><div key={e.id} className="flex justify-between gap-4 text-xs"><span><span className="mr-2 text-zinc-500">{reportingDate(e).split('-').reverse().join('/')}</span>{e.description}{e.installment?` · ${e.installment}`:''}</span><span className="whitespace-nowrap">{fmt(entryValue(e))}</span></div>)}{!rows.length&&<p className="text-xs text-zinc-500">Nenhuma compra no período.</p>}</div></details>)}</div>
 </section>;
}
