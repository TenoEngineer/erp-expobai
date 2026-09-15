# 🗄️ Guia do Banco de Dados - Supabase (PostgreSQL)

Este projeto utiliza o **PostgreSQL** hospedado na nuvem via **Supabase**.

---

## 1. Como Criar o Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com/) e faça login.
2. Clique em **"New Project"**.
3. Escolha um nome para o projeto (ex: `erp-expobai`), defina uma senha forte para o banco de dados e selecione a região mais próxima (ex: `São Paulo - South America`).
4. Aguarde cerca de 1 a 2 minutos até que o provisionamento finalize.

---

## 2. Como Executar o Script de Tabelas (Schema)

1. No painel do Supabase, clique no menu lateral **"SQL Editor"** (ícone de terminal `>_`).
2. Clique em **"New query"**.
3. Copie todo o conteúdo do arquivo [`schema.sql`](./schema.sql) e cole no editor.
4. Clique no botão verde **"Run"** (ou pressione `Ctrl + Enter`).
5. As tabelas `categorias`, `produtos`, `pedidos`, `pedido_itens` e `configuracoes` serão criadas com dados de exemplo pré-cadastrados.

---

## 3. Como Obter a `DATABASE_URL` (Connection String)

1. No Supabase, vá em **Project Settings** (ícone de engrenagem no rodapé do menu esquerdo) -> **Database**.
2. Role até a seção **"Connection string"** e clique na aba **"URI"** (ou **"Transaction Pooler"** no modo Session/Transaction).
3. A URL terá o formato:
   ```env
   DATABASE_URL=postgresql://postgres:[SUA-SENHA]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
   *(Substitua `[SUA-SENHA]` pela senha que você criou ao criar o projeto).*
4. Cole essa variável no seu arquivo `.env` dentro da pasta `server/` ou nas variáveis de ambiente do **Render**.
