# Rede Inteligente

Projeto com página pública e painel administrativo.

## Rodar localmente

1. Instale Node.js.
2. No terminal, dentro desta pasta, execute:
   npm install
3. Configure um PostgreSQL e defina a variável `DATABASE_URL`.
4. Defina `ADMIN_PASSWORD` com uma senha forte.
5. Execute:
   npm start
6. Abra `http://localhost:3000`
7. Painel: `http://localhost:3000/admin`

## Render

Crie um Web Service apontando para este projeto.
Build Command: `npm install`
Start Command: `npm start`

Crie também um PostgreSQL no Render e conecte a `DATABASE_URL` ao serviço.

Variável obrigatória:
- `ADMIN_PASSWORD` = sua senha forte

O projeto exige consentimento explícito antes de enviar os dados técnicos.
