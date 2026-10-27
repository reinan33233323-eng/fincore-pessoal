import { useState } from 'react';

type Props = {
 action:'editar'|'excluir'; entry?:{description:string;date:string;recurrence?:string};
 card?:boolean; hasSeries?:boolean; close:()=>void;
 one:()=>void|Promise<void>; series:()=>void|Promise<void>;
};
export default function RecurrenceScopeDialog({action,entry,card=false,hasSeries=true,close,one,series}:Props){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const verb=action==='editar'?'Alterar':'Excluir';
 const confirm=async(callback:()=>void|Promise<void>)=>{
  setBusy(true);setError('');try{await callback();}catch(e){setError(e instanceof Error?e.message:'Não foi possível concluir.');}finally{setBusy(false);}
 };
 return <div className="fc-overlay fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label={`${verb} recorrência`} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
  <h2 className="text-lg font-semibold">{verb} {hasSeries?'recorrência':card?'compra':'lançamento'}</h2>
  {entry&&<p className="mt-2 break-words text-sm text-zinc-600">{entry.description} · {entry.date.split('-').reverse().join('/')}</p>}
  <p className="mt-3 text-sm text-zinc-500">{hasSeries?'Escolha quais ocorrências serão afetadas.':'Confirme a exclusão desta ocorrência.'}</p>
  <div className="mt-5 grid gap-3"><button disabled={busy} onClick={()=>void confirm(one)} className="rounded-2xl border border-zinc-200 px-4 py-3 text-left text-sm hover:bg-zinc-50 disabled:opacity-50"><b className="block font-medium">{verb} somente esta ocorrência</b><span className="text-xs text-zinc-500">{hasSeries?'As outras datas continuam como estão.':'Somente o item acima será excluído.'}</span></button>
   {hasSeries&&<button disabled={busy} onClick={()=>void confirm(series)} className={`rounded-2xl px-4 py-3 text-left text-sm text-white disabled:opacity-50 ${action==='excluir'?'bg-red-600 hover:bg-red-700':'bg-[#191918] hover:bg-black'}`}><b className="block font-medium">{verb} toda a recorrência</b><span className="text-xs text-white/80">{card?'Afeta todas as ocorrências em aberto deste cartão. Faturas já pagas são preservadas.':action==='excluir'?'Exclui todos os lançamentos desta série.':'Aplica a alteração aos lançamentos desta série.'}</span></button>}
  </div>
  {error&&<p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
  <button disabled={busy} onClick={close} className="mt-4 w-full rounded-full py-2 text-sm text-zinc-500 disabled:opacity-50">{busy?'Aguarde…':'Cancelar'}</button>
 </section></div>;
}
