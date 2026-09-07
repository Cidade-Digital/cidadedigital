# Deploy — Cidade Digital na Hostinger

O front-end é uma SPA React/Vite: o build gera **arquivos estáticos** em `dist/`
que rodam em qualquer hospedagem Apache da Hostinger (plano compartilhado ou VPS).
O back-end fica **inteiro no Supabase** — a Hostinger só serve HTML/CSS/JS.

## 1. Configurar variáveis de ambiente

As variáveis `VITE_*` são **embutidas no bundle durante o build** (não existem em
runtime). Portanto o `.env` precisa estar correto **na máquina que roda `npm run build`**.

Crie o `.env` na raiz:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...        # chave "anon public" — pode ser pública
VITE_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
```

⚠️ **Nunca** coloque `SUPABASE_SERVICE_ROLE_KEY` no `.env` usado para build do front —
ela só é usada localmente pelo script `scripts/importar_lotes.mjs`.

### Supabase — antes do primeiro deploy

1. SQL Editor → rodar as migrations em ordem: `0001` → `0002` → `0003` → `0004` → `0005`.
2. Authentication → URL Configuration → **Site URL**: `https://seudominio.com.br`
   e adicionar em **Redirect URLs** o mesmo domínio.
3. (Opcional) Authentication → Providers → Email → desativar "Confirm email"
   enquanto testa.

## 2. Gerar o build

```bash
npm install
npm run build
```

Saída em `dist/` (já inclui o `.htaccess` que faz o roteamento da SPA).

## 3. Subir para a Hostinger

### Opção A — hPanel (File Manager) ou FTP  *(plano compartilhado)*

1. hPanel → **Sites** → seu site → **File Manager**.
2. Entrar em `public_html/` e **apagar** o conteúdo antigo.
3. Enviar **todo o conteúdo de `dist/`** (os arquivos de dentro, não a pasta `dist`).
   - Precisa incluir o arquivo oculto **`.htaccess`**. No File Manager ative
     "Show hidden files"; em cliente FTP (FileZilla) ative a exibição de ocultos.
4. Estrutura final esperada:
   ```
   public_html/
     index.html
     .htaccess
     assets/
   ```
5. Abrir `https://seudominio.com.br` — testar navegar para `/painel` e dar F5
   (o `.htaccess` garante que não dá 404).

### Opção B — Deploy via Git  *(hPanel → Avançado → GIT)*

A Hostinger **não roda `npm run build`** no plano compartilhado. Então:

1. Faça o `npm run build` localmente e **comite a pasta `dist/`** (ou use uma
   branch `deploy` só com o conteúdo do `dist`).
2. hPanel → GIT → conectar o repositório, branch e diretório `public_html`.
3. A cada atualização: `npm run build` local → commit → "Deploy" no hPanel.

### Opção C — VPS Hostinger

Aí dá para automatizar: `git pull && npm ci && npm run build` e apontar o Nginx/Apache
para `dist/`. Regra de fallback do Nginx:

```nginx
location / { try_files $uri $uri/ /index.html; }
```

## 4. Domínio e HTTPS

- hPanel → Domínios → apontar o domínio para o site (ou configurar DNS se o
  registro for externo).
- hPanel → SSL → emitir certificado gratuito (Let's Encrypt) e forçar HTTPS.
- Depois do domínio final ativo, confirmar o **Site URL** no Supabase (passo 1).

## 5. Atualizações futuras

```bash
git pull            # se estiver versionado
npm install
npm run build
# subir o novo conteúdo de dist/ para public_html/
```

Como os assets têm hash no nome e o `index.html` é `no-cache`, o navegador pega a
versão nova automaticamente.

## Checklist rápido

- [ ] Migrations `0001`–`0005` aplicadas no Supabase
- [ ] `.env` com URL + anon key corretos na máquina de build
- [ ] `npm run build` sem erro
- [ ] Conteúdo de `dist/` (com `.htaccess`) em `public_html/`
- [ ] Site URL / Redirect URLs no Supabase = domínio de produção
- [ ] SSL ativo e HTTPS forçado
- [ ] Um usuário promovido a admin: `update perfis set funcao='admin' where email='...';`
