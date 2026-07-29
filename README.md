# MedQuestões

Banco de questões médicas com filtros por área e subtema, resolução comentada, estatísticas locais, cadastro manual e importação de TXT/PDF.

## Formato de importação

```txt
1. Enunciado da questão?
A) Alternativa A
B) Alternativa B
C) Alternativa C
D) Alternativa D
Gabarito: B
Explicação: Comentário opcional
---
```

## Banco de dados

As questões ficam armazenadas em um banco IndexedDB no navegador. Na primeira
execução, as questões de exemplo e os dados antigos do `localStorage` são
migrados automaticamente.

O banco é local ao navegador e ao dispositivo. Ele funciona offline e não
exige conta, servidor ou chave de API.

## Sincronização entre dispositivos

O projeto também oferece login, sincronização e histórico de desempenho com
Supabase:

1. Crie um projeto em https://supabase.com.
2. Abra o SQL Editor e execute `supabase/schema.sql`.
3. Copie `.env.example` para `.env`.
4. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. Execute `npm install` e `npm run dev`.

A chave `anon` pode ser usada no navegador porque as tabelas estão protegidas
por Row Level Security. Nunca coloque a chave `service_role` no frontend.

O painel de desempenho registra cada tentativa e permite filtrar por área e
pelos últimos 7, 30, 90 ou 365 dias, além de todo o histórico.
