# Fincore_Pessoal

Acesso: https://reinan33233323-eng.github.io/fincore-pessoal/

Repositorio: https://github.com/reinan33233323-eng/fincore-pessoal

Instalação independente, baseada no Perino, com identidade preta e cinza, contas bancárias separadas dos centros e sem Notas da equipe ou administração de usuários na interface.

Somente `master@financeiro.com`, com perfil Master, pode entrar. A senha é definida diretamente no projeto Supabase próprio. Sessão local com chave exclusiva `fincore-pessoal.auth`.

Banco exclusivo: `fincore_pessoal` (`ixujnwupnsggebzisxpp`). A aplicação aceita somente esse projeto. Instalação iniciada sem dados financeiros, com um único Master e novos cadastros desativados.

## Instalação em projeto novo

1. Aplicar `supabase/instalacao-limpa.sql` uma única vez em um projeto Supabase vazio.
2. Desativar novos cadastros no Supabase (Allow new users to sign up).
3. Criar somente `master@financeiro.com` pelo painel de Authentication, com e-mail confirmado.
4. Executar `supabase/ativar-master.sql`.
5. Preencher `.env.local` com URL e chave pública próprias, usando `.env.example`.
6. `npm ci`, `npm run build`, ou `npm run dev`.

Nenhum dado financeiro é importado. O original e o Perino foram apenas lidos para preparar a cópia.

## Cartões e saldos

Cartões possuem fechamento e vencimento próprios. Compras à vista ou parceladas viram despesas previstas, classificadas por centro e plano de contas. A fatura é agrupada pelo mês de vencimento. Registrar o pagamento baixa as parcelas em aberto e vincula a conta bancária, com uma única operação atômica e sem duplicar a despesa.

Em Contas, **Editar saldo** informa o saldo total ao final da data escolhida. O banco calcula e guarda somente a diferença em um histórico separado, sem sobrescrever lançamentos. Ajustes também aparecem identificados no dashboard e nos relatórios. O saldo anterior é transportado entre meses. Realizados usam a data de pagamento; previstos usam vencimento.

Migração exclusiva desta instalação: `supabase/migrations/20261015100000_personal_credit_and_balances.sql`.
