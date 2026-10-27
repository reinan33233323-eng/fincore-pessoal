export type SeriesScope='one'|'series';
type Occurrence={id:string;seriesId?:string|null;status?:string};
/** A single occurrence is identified by ID, including weekly or split payments. */
export function seriesTargets<T extends Occurrence>(entries:T[],selected:Occurrence,scope:SeriesScope,openOnly=false):T[]{
 return entries.filter(entry=>(scope==='series'&&selected.seriesId?entry.seriesId===selected.seriesId:entry.id===selected.id)&&(!openOnly||entry.status==='previsto'));
}
