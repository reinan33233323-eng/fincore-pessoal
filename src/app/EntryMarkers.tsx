import { Layers, Repeat2 } from 'lucide-react';

export default function EntryMarkers({entry}:{entry:{installment?:string;recurrence?:string}}) {
 const recurring=entry.recurrence==='mensal'||entry.recurrence==='semanal';
 if(!entry.installment&&!recurring)return null;
 return <span className="inline-flex shrink-0 flex-wrap items-center gap-1.5">
  {entry.installment&&<span title={`Parcela ${entry.installment}`} className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-[11px] font-semibold leading-none text-blue-800 ring-1 ring-inset ring-blue-200"><Layers size={12} aria-hidden="true"/>Parcela {entry.installment}</span>}
  {recurring&&<span title={`Recorrência ${entry.recurrence}`} className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-1 text-[11px] font-semibold leading-none text-violet-800 ring-1 ring-inset ring-violet-200"><Repeat2 size={12} aria-hidden="true"/>{entry.recurrence==='mensal'?'Mensal':'Semanal'}</span>}
 </span>;
}
