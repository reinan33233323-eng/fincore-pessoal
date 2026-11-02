import {useEffect,useId,useRef,useState} from 'react';
import {ChevronDown,Check} from 'lucide-react';
import {matchingCategories} from '../lib/categories';

export default function CategoryPicker({value,options,onChange}:{value:string;options:{id:string;name:string}[];onChange:(name:string)=>void}){
 const id=useId(),[text,setText]=useState(value),[query,setQuery]=useState(''),[open,setOpen]=useState(false),[active,setActive]=useState(-1);
 const list=useRef<HTMLSpanElement>(null);
 const matches=matchingCategories(options,query);
 useEffect(()=>{if(open&&active>=0)list.current?.children[active]?.scrollIntoView({block:"nearest"});},[active,open]);
 useEffect(()=>{if(!open)setText(value);},[value,open]);
 const close=()=>{setOpen(false);setQuery('');setActive(-1);setText(value);};
 const choose=(name:string)=>{onChange(name);setText(name);setQuery('');setOpen(false);setActive(-1);};
 return <span className="relative mt-1.5 block font-normal" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))close();}}>
  <span className="relative block"><input aria-label="Categoria" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`} aria-activedescendant={open&&active>=0?`${id}-${active}`:undefined} autoComplete="off" required value={text} placeholder="Digite para buscar uma categoria…" onFocus={()=>{setOpen(true);setQuery('');setActive(-1);}} onChange={e=>{const next=e.target.value;setText(next);setQuery(next);setOpen(true);setActive(-1);onChange(options.find(o=>o.name.toLocaleLowerCase('pt-BR')===next.toLocaleLowerCase('pt-BR'))?.name||'');}} onKeyDown={e=>{
   if(e.key==='Escape'){e.preventDefault();close();}
   else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(old=>!matches.length?-1:e.key==='ArrowDown'?Math.min(old+1,matches.length-1):Math.max(0,old-1));}
   else if(e.key==='Enter'&&open){e.preventDefault();const match=matches[active>=0?active:query?0:-1];if(match)choose(match.name);}
  }} className="w-full rounded-xl border bg-zinc-50 p-3 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"/><ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-3.5 text-zinc-500"/></span>
  {open&&<span ref={list} role="listbox" id={`${id}-options`} aria-label="Categorias disponíveis" className="absolute left-0 right-0 top-full z-50 mt-1 block max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-xl">{matches.map((option,index)=><button type="button" role="option" aria-selected={value===option.name} id={`${id}-${index}`} key={option.id} onMouseDown={e=>e.preventDefault()} onMouseEnter={()=>setActive(index)} onClick={()=>choose(option.name)} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${active===index?'bg-violet-50 text-violet-900':'text-zinc-800 hover:bg-zinc-50'}`}><span>{option.name}</span>{value===option.name&&<Check size={15} className="shrink-0 text-violet-700"/>}</button>)}{!matches.length&&<span className="block px-3 py-3 text-sm text-zinc-500">Nenhuma categoria encontrada. Tente outro termo.</span>}</span>}
 </span>;
}
