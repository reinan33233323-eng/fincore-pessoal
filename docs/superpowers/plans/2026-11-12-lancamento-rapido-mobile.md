# Lançamento rápido no celular — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela "Lançamento rápido" que abre no celular e grava despesas bancárias e compras no cartão exatamente como o formulário completo.

**Architecture:** Lógica pura em `src/lib/quickEntry.ts` (monta a despesa bancária e as linhas da compra no cartão, testável com `node --test`). Tela em `src/app/QuickEntry.tsx`, que recebe `saveBank` e `saveCard` do App. `App.tsx` decide abrir a tela no celular e liga "Mais detalhes" ao `EntryForm` com um novo prop `draft`.

**Tech Stack:** React 18 + Vite + Tailwind, Supabase via `src/lib/bridge.ts`, testes `node --test tests/*.test.mjs` (Node 24, importa `.ts` direto).

**Spec:** `docs/superpowers/specs/2026-11-12-lancamento-rapido-mobile-design.md`

## Global Constraints

- Celular = largura < 768px (`useIsMobile` de `src/app/components/ui/use-mobile.ts`).
- Desktop não muda: nada de layout novo acima de 768px, a não ser que a pessoa navegue até a tela.
- Sem migrações nem mudanças no Supabase.
- Parcelas no cartão: 1 a 24.
- Textos da interface em português do Brasil.
- `localStorage` sempre em try/catch. Chaves: `fincore-pessoal.quick.source` e `fincore-pessoal.quick.unit`.

## Review Focus

1. Valor "0" ou vazio: o app aceita lançamentos de valor zero (commit 5e18ffc). Vazio deve bloquear, "0,00" deve gravar.
2. Banco ou cartão lembrado que foi excluído: o chip padrão volta para `defaultBankId`, ou para o primeiro banco/cartão, sem quebrar.
3. Nenhum banco nem cartão cadastrado: a tela mostra um aviso e o link para o app completo, sem botão Lançar ativo.
4. Toque duplo em "Lançar" no cartão: não pode gerar compras duplicadas (mesma proteção `pendingSave` do `CreditCards`).
5. Data de compra no dia do fechamento: a fatura mostrada na tela é a mesma que `cardSchedule` grava (as duas usam `invoiceDate`).

---

### Task 1: Lógica pura do lançamento rápido

**Files:**
- Create: `src/lib/quickEntry.ts`
- Modify: `src/app/CreditCards.tsx` (ramo "nova compra" de `savePurchase`, linhas ~66-72)
- Test: `tests/quickEntry.test.mjs`

**Interfaces:**
- Produces:
  - `type QuickInput = { amount: number; category: string; description: string; date: string; unit: string; paid: boolean; installments: number }`
  - `quickBankEntry(input: QuickInput, bankId: string): Omit<Entry,'id'>`-compatible object: `kind:'despesa'`, `account:''`, `beneficiary:''`, `pix:''`, `notes:''`, `attachments:[]`, `recurrence:'nenhuma'`, `installments:1`, `juros:0`, `discount:0`, `bankId`, `status: paid?'realizado':'previsto'`, `paidDate: paid?date:null`, `description: description.trim()||category`.
  - `quickCardData(input: QuickInput)`: o objeto `data` que `cardSchedule` espera (`kind:'despesa'`, `recurrence:'nenhuma'`, `installments: input.installments`, mesmos campos de texto vazios, `description` com a mesma regra).
  - `newCardPurchaseRows(data: any, card: CreditCard, parts?: {date:string;amount:string}[]): any[]`: `cardSchedule` + `id: crypto.randomUUID()` em cada linha + `seriesId` compartilhado quando houver mais de uma linha ou recorrência.
  - `pickSource(remembered: string|null, banks:{id:string;name:string}[], cards:{id:string}[]): {type:'bank'|'card'; id:string} | null`: valor lembrado no formato `bank:<id>`/`card:<id>`, se ainda existir; senão `defaultBankId(banks)`; senão o primeiro banco; senão o primeiro cartão; senão `null`.

- [ ] **Step 1: Write the failing tests** em `tests/quickEntry.test.mjs`:
  - `quickBankEntry` com `paid:true, date:'2026-11-12'` → `status==='realizado'`, `paidDate==='2026-11-12'`, `bankId==='b1'`.
  - `paid:false` → `status==='previsto'`, `paidDate===null`.
  - descrição `'  '` com categoria `'Mercado'` → `description==='Mercado'`.
  - `amount:0` → `amount===0` (zero é permitido).
  - `newCardPurchaseRows(quickCardData({...,amount:300,installments:3,date:'2026-10-15'}), card{closing_day:25,due_day:5})` → 3 linhas, ids distintos, mesmo `seriesId` definido, datas `'2026-11-05','2026-12-05','2027-01-05'`, soma 300.
  - 1 parcela → 1 linha, `seriesId===undefined`, `invoiceMonth==='2026-11'`.
  - compra em `'2026-10-25'` (dia do fechamento) → `date` igual a `invoiceDate('2026-10-25',card,0)`.
  - `pickSource('card:c1',banks,[{id:'c1'}])` → `{type:'card',id:'c1'}`. `pickSource('card:gone',[{id:'i',name:'Itaú'},{id:'n',name:'Nubank'}],[])` → `{type:'bank',id:'i'}`. `pickSource(null,[],[])` → `null`.

- [ ] **Step 2: Run** `node --test tests/quickEntry.test.mjs`. Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement** `src/lib/quickEntry.ts` com as quatro funções acima (imports com extensão `.ts`, como em `cardLedger.ts`).

- [ ] **Step 4: Refactor** `CreditCards.tsx`: no ramo `else` de `savePurchase`, trocar `cardSchedule`, `randomUUID` e `seriesId` por `newCardPurchaseRows(data,card,parts)`. Manter o `pendingSave` como está.

- [ ] **Step 5: Run** `node --test tests/*.test.mjs` e `npm run build`. Expected: todos passam (72 + novos), e o build termina sem erro.

- [ ] **Step 6: Commit** `git add src/lib/quickEntry.ts src/app/CreditCards.tsx tests/quickEntry.test.mjs && git commit -m "Add quick entry helpers and share card purchase rows"`

### Task 2: Tela QuickEntry

**Files:**
- Create: `src/app/QuickEntry.tsx`

**Interfaces:**
- Consumes: Task 1 (`QuickInput`, `quickBankEntry`, `quickCardData`, `newCardPurchaseRows`, `pickSource`); `CategoryPicker`; `CurrencyInput`, `parseMoney`, `fmt` de `./shared`; `invoiceDate`, `invoiceCycle` de `../lib/credit`; `saveCardPurchases` de `../lib/bridge`.
- Produces: `export default function QuickEntry(props: { banks: Bank[]; cards: CreditCard[]; categories: {id:string;name:string;kind?:string}[]; units: {name:string}[]; saveBank: (x: any) => Promise<void>; onCardSaved: () => Promise<void>; onMoreDetails: (draft: {source:{type:'bank'|'card';id:string}; input: QuickInput}) => void; onOpenApp: () => void })`

- [ ] **Step 1: Implement** a tela na ordem da spec: valor grande (`inputMode="decimal"`, `autoFocus`); chips "Onde pagou" (bancos e depois cartões, com rótulo "Cartão" no cartão); `CategoryPicker` só com categorias de despesa (mesmo filtro que o `EntryForm` usa); descrição; data (hoje, `localDateKey`); select de parcelas 1–24 só no cartão, com a linha "Cai na fatura de <mês/ano>, vence <dd/mm>" calculada por `invoiceDate`; checkbox "Já pago" (padrão marcado) só no banco; botão "Lançar"; links "Mais detalhes" e "Abrir app completo". O centro de custo vem de `fincore-pessoal.quick.unit` se existir em `units`; senão, `units[0].name`. Um select pequeno "Centro" fica no fim, para trocar.
- [ ] **Step 2: Save behavior**: banco chama `saveBank(quickBankEntry(...))`. Cartão chama `saveCardPurchases(rows)` e depois `onCardSaved()`, com um `useRef` `pendingSave` igual ao do `CreditCards`, para que o toque duplo reutilize as mesmas linhas. O botão fica desativado enquanto salva, e também se faltar valor, categoria ou origem. Se der certo: mostra a mensagem "Lançado: R$ X em <categoria>", limpa valor, descrição e parcelas, mantém origem, data e centro e grava a origem e o centro no `localStorage`. Se der erro: mostra a mensagem e mantém os campos.
- [ ] **Step 3: Empty state**: se `pickSource` retornar `null`, mostra "Cadastre um banco ou cartão no app completo" e o link.
- [ ] **Step 4: Run** `npm run build`. Expected: sucesso.
- [ ] **Step 5: Commit** `git add src/app/QuickEntry.tsx && git commit -m "Add mobile quick entry screen"`

### Task 3: Ligar no App (celular, botão +, Mais detalhes)

**Files:**
- Modify: `src/app/App.tsx` (estado `screen` ~3190, render das telas, `EntryForm` ~1222 e ~4685, renderForm do cartão ~4486)
- Modify: `src/app/CreditCards.tsx` (novo prop opcional `draftPurchase`)

**Interfaces:**
- Consumes: Task 2 `QuickEntry` props.
- Produces: `EntryForm` ganha `draft?: Partial<Entry>`. Ele só preenche os valores iniciais dos campos quando `editing` é null; o resto do formulário continua tratando como lançamento novo. `CreditCards` ganha `draftPurchase?: {cardId:string; data:any} | null` e `onDraftConsumed?: () => void`. Ao montar com esse prop, seleciona o cartão e abre o formulário de compra com `renderForm(null, …)` usando o draft.

- [ ] **Step 1:** no `App`, `const isMobile = useIsMobile()`. Um efeito roda uma vez, quando `currentUser && dataReady && isMobile`, e chama `setScreen("rapido")`.
- [ ] **Step 2:** com `screen === "rapido"`, renderiza só `QuickEntry` em tela cheia (sem sidebar), passando `banks`, `cards`, `categories`, `allowedUnits`, `saveBank={(x)=>save(x,"one")}` (o mesmo `save` do `EntryForm`), `onCardSaved` = a mesma função de recarga que o `CreditCards` recebe como `onRefresh`, `onOpenApp={()=>setScreen("dashboard")}`.
- [ ] **Step 3:** `onMoreDetails`: no banco, guarda o draft em estado e faz `setModal("despesa")`. O `EntryForm` recebe `draft` com amount, category, description, date, unit, bankId e status/paidDate. No cartão, vai para a tela de cartões com `draftPurchase`. Adiciona `draft` nas inicializações de `useState` do `EntryForm` (`editing?.x ?? draft?.x ?? default`) e passa o draft pelo `renderForm` do cartão.
- [ ] **Step 4:** botão flutuante "+" (`fixed bottom-5 right-5`, só quando `isMobile && screen !== "rapido"`) que faz `setScreen("rapido")`.
- [ ] **Step 5: Run** `node --test tests/*.test.mjs` e `npm run build`. Expected: tudo passa.
- [ ] **Step 6: Verificar no navegador** (`npm run dev`, Playwright em 390×844): depois do login, abre o Lançamento rápido. Lançar 1 despesa no banco aparece em Lançamentos. Lançar uma compra 3x no cartão aparece nas 3 faturas. "Mais detalhes" abre o formulário preenchido. Em 1280px, a tela inicial continua no dashboard.
- [ ] **Step 7: Commit** `git add src/app/App.tsx src/app/CreditCards.tsx && git commit -m "Open quick entry on mobile and link to full forms"`
