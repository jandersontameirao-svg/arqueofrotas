# Deploy — ArqueoFrotas em `arqueofrotas.sigpa.com.br`

Guia passo a passo para a VPS Hostinger (Ubuntu 24.04, como `root`). O app roda
nativo (Node + PM2) escutando em **127.0.0.1:8001**, com **nginx** fazendo proxy
do subdomínio e **HTTPS** via certbot.

> **Autenticação:** este deploy usa **login próprio** (e-mail + senha). A
> dependência do OAuth da Manus foi removida. Você cria o primeiro admin com um
> script interativo e, depois, gerencia usuários dentro do app.

---

## 0. Pré-requisitos (uma vez)

Confirme Node 20+ e nginx:

```bash
node -v        # precisa ser >= 20 (ideal 22)
nginx -v
```

Se o Node for antigo ou ausente, instale o Node 22:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
corepack enable
```

---

## 1. DNS (registro.br) — JÁ FEITO ✅

Registro A criado: **`arqueofrotas`** → `2.24.109.107`.
Confirme a propagação (pode levar alguns minutos):

```bash
dig +short arqueofrotas.sigpa.com.br
# deve responder: 2.24.109.107
```

---

## 2. Confirmar a porta livre

A porta escolhida é **8001**. Confirme que está livre:

```bash
ss -tlnp | grep ':8001' || echo "8001 LIVRE"
```

Se aparecer algo usando 8001, me avise para escolher outra (ex. 8002) e ajustar
`.env`, `ecosystem.config.cjs` e o `nginx-arqueofrotas.conf`.

---

## 3. Banco de dados MySQL

Crie o banco e um usuário dedicado. O MySQL vai **pedir a senha do root** e,
logo depois, você define a **senha do usuário do app** (você digita — eu não
digito senha por você).

```bash
mysql -u root -p
```

No prompt do MySQL (troque `SENHA_FORTE_AQUI`):

```sql
CREATE DATABASE arqueofrotas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'arqueofrotas'@'127.0.0.1' IDENTIFIED BY 'SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON arqueofrotas.* TO 'arqueofrotas'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

---

## 4. Clonar o projeto

As mudanças de login próprio + deploy estão no branch
`feat/login-proprio-deploy`. Clone já apontando para ele:

```bash
mkdir -p /var/www
cd /var/www
git clone -b feat/login-proprio-deploy \
  https://github.com/jandersontameirao-svg/arqueofrotas.git arqueofrotas
cd /var/www/arqueofrotas
```

> Depois que você revisar e fizer o merge desse branch na branch principal no
> GitHub, pode clonar normalmente (sem o `-b`).

---

## 5. Criar o `.env`

```bash
cp deploy/.env.example .env
nano .env
```

Preencha:

- `DATABASE_URL=mysql://arqueofrotas:SENHA_FORTE_AQUI@127.0.0.1:3306/arqueofrotas`
  (a mesma senha definida no passo 3)
- `JWT_SECRET=` → gere com:

  ```bash
  openssl rand -hex 32
  ```

- `VITE_APP_ID=arqueofrotas` (pode deixar como está)
- `PORT=8001`, `HOST=127.0.0.1`, `NODE_ENV=production` (já vêm prontos)

> ⚠️ Importante: `VITE_APP_ID` é embutido no bundle durante o build, então o
> `.env` precisa existir **antes** do passo 6.

---

## 6. Instalar, buildar e migrar

Opção A — automático:

```bash
bash deploy/provision.sh
```

Opção B — manual (passo a passo):

```bash
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm install --frozen-lockfile
pnpm rebuild esbuild @tailwindcss/oxide
pnpm run build
pnpm exec drizzle-kit migrate      # cria todas as tabelas no banco
```

---

## 7. Criar o primeiro admin (interativo)

```bash
pnpm create-admin
```

O script pergunta nome, e-mail e **senha (digitada por você, oculta)** e cria um
usuário com papel `admin`. É com esse e-mail/senha que você fará o primeiro login.

---

## 8. Subir no PM2

Se usou a Opção B (manual):

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root   # garante restart no boot (rode o comando que ele imprimir)
```

Verifique:

```bash
pm2 status
curl -I http://127.0.0.1:8001            # deve responder HTTP 200
```

---

## 9. nginx (proxy do subdomínio)

```bash
cp deploy/nginx-arqueofrotas.conf /etc/nginx/sites-available/arqueofrotas.conf
ln -s /etc/nginx/sites-available/arqueofrotas.conf /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

Teste HTTP:

```bash
curl -I http://arqueofrotas.sigpa.com.br
```

---

## 10. HTTPS (certbot)

```bash
certbot --nginx -d arqueofrotas.sigpa.com.br --redirect
```

Isso emite o certificado, configura o bloco 443 e redireciona HTTP→HTTPS.

Acesse: **https://arqueofrotas.sigpa.com.br** → faça login com o admin do passo 7.

---

## Atualizações futuras (deploy de nova versão)

```bash
cd /var/www/arqueofrotas
git pull
pnpm install --frozen-lockfile
pnpm run build
pnpm exec drizzle-kit migrate      # só se houver novas migrations
pm2 reload arqueofrotas
```

---

## Gerenciamento de usuários

Após o primeiro login como admin, crie os demais usuários pela tela
**Usuários** do app (papéis: admin, gestor_frota, motorista, manutenção).
Para redefinir senha de alguém, há a ação de reset no backend
(`users.resetPassword`); o próprio usuário pode trocar a senha via
`users.changePassword`.

## Observações de segurança

- O app escuta apenas em `127.0.0.1:8001`; só o nginx o expõe.
- O cookie de sessão é `httpOnly` + `secure` (exige HTTPS — por isso o passo 10).
- Nunca comite o `.env` (já está no `.gitignore`).
