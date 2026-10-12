# Frontend Maré

Aplicação web da Maré, construída com React, Vite e React Router. O cliente usa a API do projeto para autenticação e acesso aos dados; não contém nem deve conter credenciais do servidor ou do banco.

## Requisitos

- Node.js 20.19 ou superior.
- API Maré acessível pelo navegador.

## Desenvolvimento

Dentro da pasta do frontend:

```bash
cd client
npm install
npm run dev
```

Abra `http://localhost:5173`. O Vite encaminha chamadas `/api` para `http://localhost:3001`. Inicie a API em outro terminal, dentro da pasta `server`, com `npm run dev`.

Para apontar o cliente a outra URL de API, crie `client/.env` com:

```env
VITE_API_URL=https://api.seudominio.com/api
```

O valor deve terminar em `/api`. `VITE_*` é incorporado ao JavaScript distribuído e fica visível para qualquer visitante: nunca coloque tokens, senhas ou chaves nesse arquivo.

## Build e publicação

```bash
cd client
npm run build
npm run preview
```

O build estático fica em `client/dist`. Publique esse diretório em um serviço de hospedagem estática, configurando `VITE_API_URL` no ambiente de build para a URL HTTPS da API e gerando novamente o build após alterar a variável. Configure o serviço para servir `index.html` como fallback para rotas da aplicação.

O service worker e o manifesto são gerados pelo Vite PWA no build de produção. Para instalar, acesse o site por HTTPS (ou `localhost` durante testes) e use o botão **Instalar aplicativo** quando o navegador oferecer essa opção. No iPhone/iPad, abra no Safari, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**. O aplicativo armazena o shell da interface para abrir offline; autenticação, registros e arquivos continuam dependendo da API e não são guardados para uso offline.

Para publicar o código do frontend em um repositório independente, primeiro crie um repositório vazio no GitHub e use a URL dele no comando abaixo:

```bash
cd client
git init
git add .
git commit -m "Publica o frontend"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/mare-front.git
git push -u origin main
```

O projeto tem lockfile próprio. O `.gitignore` exclui `node_modules`, `.env` e `dist`; mantenha essa proteção.

## Segurança e integração com a API

- O navegador envia cookies nas chamadas da API (`credentials: include`). A API precisa permitir a origem HTTPS exata do frontend em `CLIENT_ORIGIN` e responder com credenciais habilitadas.
- Sessões e refresh tokens ficam em cookies `HttpOnly`; operações mutáveis também usam proteção CSRF. Não desative essas proteções para resolver erros de CORS.
- CORS e `Origin` restringem navegadores compatíveis, mas não provam que uma chamada veio do código legítimo do frontend. O endereço do frontend, o JavaScript e `VITE_API_URL` são públicos; qualquer pessoa pode inspecionar o cliente e fazer chamadas próprias. A API deve validar autenticação, autorização e dados em cada operação, e nunca confiar em verificações feitas apenas pelo frontend.
- Use HTTPS tanto no site quanto na API. Se estiverem em sites diferentes, configure `COOKIE_SAME_SITE=none` na API; nesse modo, cookies `Secure` exigem HTTPS. Alguns navegadores podem bloquear cookies de terceiros, então prefira domínios sob o mesmo domínio registrável, como `app.seudominio.com` e `api.seudominio.com`.
- Não use dados reais de saúde em desenvolvimento ou ambientes sem controles adequados.

## Testes

```bash
cd client
npm test
```
