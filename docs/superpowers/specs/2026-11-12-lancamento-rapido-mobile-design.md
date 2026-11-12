# Lançamento rápido no celular — design

## Intenção

Lançar uma despesa no banco ou uma compra no cartão pelo celular, com poucos toques, na hora do gasto. O formulário completo (`EntryForm`) tem campos demais para isso. Detalhes podem ser completados depois no computador.

## Objetivos

- No celular (largura < 768px), depois do login, abrir direto a tela "Lançamento rápido".
- Uma tela só: valor, onde pagou (banco ou cartão), categoria, descrição, data, parcelas (só cartão) e "Já pago" (só banco).
- Gravar exatamente como hoje: despesa bancária pelo mesmo `save` do App, compra no cartão pelo mesmo `cardSchedule` + `saveCardPurchases`. Faturas, saldos e relatórios não mudam.
- Depois de salvar, mostrar confirmação e limpar o formulário para o próximo lançamento.

## Fora do escopo

- Deixar dashboard, listas e relatórios responsivos (ficou para depois, opção C).
- Receitas, recorrência, divisão no mesmo mês, juros/desconto, anexos e fornecedor na tela rápida. Esses campos continuam disponíveis em "Mais detalhes".
- Mudanças no banco de dados.

## Antiobjetivos

- Lançamento rápido que grava diferente do formulário completo, por exemplo uma compra no cartão que não aparece na fatura certa.
- Qualquer mudança no comportamento do desktop.

## Abordagens consideradas

- **A. Tela própria de lançamento rápido (escolhida).** É a mais rápida de usar e não toca no desktop. Custo: uma tela nova para manter.
- B. Adaptar o `EntryForm` ao celular. Continuaria longo e não ficaria "rápido".
- C. App inteiro responsivo. Projeto grande, que atrasaria o lançamento rápido.

## Como funciona

**Tela** (`src/app/QuickEntry.tsx`), de cima para baixo:

1. **Valor**: campo grande com teclado numérico (`inputMode="decimal"`), focado ao abrir.
2. **Onde pagou**: chips com os bancos e depois os cartões. Começa no último usado (lembrado no `localStorage`); na primeira vez, usa `defaultBankId` (Itaú).
3. **Categoria**: reaproveita o `CategoryPicker` (busca enquanto digita), com as categorias de despesa. Obrigatória.
4. **Descrição**: opcional. Se ficar vazia, grava o nome da categoria.
5. **Data**: hoje por padrão.
6. **Parcelas**: só para cartão, de 1x a 24x. No cartão, mostra em qual fatura a compra cai (`invoiceCycle`).
7. **Já pago**: só para banco, marcado por padrão. Marcado grava `status: realizado` com `paidDate` igual à data; desmarcado grava como previsto.
8. Botão **Lançar**.
9. Links **Mais detalhes** (abre o `EntryForm` completo com o que já foi digitado) e **Abrir app completo**.

**Valores padrão invisíveis:** centro de custo = último usado (lembrado), começando pelo primeiro de `allowedUnits`. Fornecedor, PIX, observações e anexos ficam vazios.

**Gravação:**
- Banco: monta o `Omit<Entry,"id">` e chama o mesmo `save(x, "one")` que o App passa ao `EntryForm`.
- Cartão: a parte "nova compra" de `savePurchase` em `CreditCards.tsx` passa para uma função exportada (por exemplo `createCardPurchase(data, card)`, usando `cardSchedule` + `saveCardPurchases`), usada pelo `CreditCards` e pela tela rápida. A proteção contra clique duplo (`pendingSave`) vai junto.

**Navegação:** no celular, `screen` inicial = `"rapido"`. A tela rápida tem o próprio cabeçalho mínimo (logo + "app completo"). No app completo, um botão flutuante "+" no celular volta para ela.

## Decisões que deixei para quem constrói

- Lembrar "último banco/cartão" e "último centro" no `localStorage`, com try/catch.
- Limite de 24 parcelas.
- Testes: um teste em `tests/` para a função extraída de compra no cartão e para a montagem da despesa bancária (status/paidDate).
