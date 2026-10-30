type CardBalanceSetting={id:string;include_in_balance?:boolean};
type CardLinkedEntry={creditCardId?:string|null;paysCardId?:string|null};
/** Exclude control-only cards from cash, while leaving spending reports intact. */
export function balanceCardEntries<T extends CardLinkedEntry>(entries:T[],cards:CardBalanceSetting[]):T[]{
 const excluded=new Set(cards.filter(card=>card.include_in_balance===false).map(card=>card.id));
 return entries.filter(entry=>!excluded.has(entry.creditCardId||entry.paysCardId||''));
}
