# Configuração do Supabase — MedQuestões

O Supabase será o banco de dados e o sistema de login do site. Assim, respostas,
histórico e desempenho ficam sincronizados entre computador e celular.

## 1. Criar o projeto

1. Entre em https://supabase.com e crie uma conta.
2. Clique em **New project**.
3. Escolha um nome, uma senha forte para o banco e a região mais próxima.
4. Aguarde o projeto terminar de ser criado.

## 2. Criar as tabelas

1. No menu do Supabase, abra **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo `supabase/schema.sql` deste projeto.
4. Copie todo o conteúdo, cole no editor e clique em **Run**.

Esse script cria as tabelas de questões e tentativas, além das regras que impedem
um usuário de acessar os dados de outro.

## 3. Configurar o login

1. Abra **Authentication > Providers**.
2. Confirme que o provedor **Email** está habilitado.
3. Em **Authentication > URL Configuration**, use:
   - Desenvolvimento: `http://localhost:5173`
   - Produção: o endereço final do site na Vercel
4. Adicione os dois endereços em **Redirect URLs** se for testar localmente e na
   Vercel.

Para testes, é possível desativar temporariamente a confirmação de e-mail nas
configurações do provedor Email. Em produção, é mais seguro mantê-la habilitada.

## 4. Conectar o site

1. No Supabase, abra **Project Settings > API** (em algumas telas aparece como
   **Connect**).
2. Copie o **Project URL**.
3. Copie a chave pública **anon** ou **publishable**.
4. Na raiz do projeto, crie um arquivo chamado `.env`.
5. Preencha:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

Nunca coloque a chave `service_role` no site.

## 5. Testar no computador

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`, crie uma conta e responda uma questão.

## 6. Configurar na Vercel

1. Abra o projeto na Vercel.
2. Vá em **Settings > Environment Variables**.
3. Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Faça um novo deploy.
5. Entre no site pelo computador e celular usando a mesma conta.

O histórico e o gráfico de desempenho devem aparecer nos dois dispositivos.
