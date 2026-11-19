/** Direct invoice links win; opening the cards screen normally starts with Nubank. */
export function initialCardId(cards:{id:string;name:string}[],focused?:string|null){
 return cards.find(c=>c.id===focused)?.id||cards.find(c=>/\bnu\s*bank\b/i.test(c.name))?.id||cards[0]?.id||'';
}
