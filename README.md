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
