# Fincore_Pessoal

Instalação independente, baseada no Perino, com identidade preta e cinza, contas bancárias separadas dos centros e sem Notas da equipe ou administração de usuários na interface.

Somente `master@financeiro.com`, com perfil Master, pode entrar. A senha será definida no projeto Supabase próprio. Sessão local com chave exclusiva `fincore-pessoal.auth`.

Sem dados, credenciais ou vínculo com os bancos original e Perino; a aplicação bloqueia essas duas conexões. O banco novo ainda precisa ser identificado e configurado.

## Instalação em projeto novo

1. Aplicar `supabase/instalacao-limpa.sql` uma única vez em um projeto Supabase vazio.
2. Desativar novos cadastros no Supabase (Allow new users to sign up).
3. Criar somente `master@financeiro.com` pelo painel de Authentication, com e-mail confirmado.
4. Executar `supabase/ativar-master.sql`.
5. Preencher `.env.local` com URL e chave pública próprias, usando `.env.example`.
6. `npm ci`, `npm run build`, ou `npm run dev`.

Nenhum dado financeiro é importado. O original e o Perino foram apenas lidos para preparar a cópia.
