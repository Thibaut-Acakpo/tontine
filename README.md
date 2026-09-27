# Plateforme de gestion de tontine

Application web complète réalisée d'après le *Cahier des charges technique et de sécurité* :

- **Frontend** : React + Vite (pièce 3D, fond de pièces animé, cartes inclinables, apparitions au défilement)
- **Backend** : Node.js + Express, API REST sécurisée (`/api/auth`, `users`, `tontines`, `members`, `contributions`, `payments`, `transactions`, `notifications`, `admin`, `webhooks`)
- **Base de données** : MySQL 8 ou MariaDB (XAMPP / WAMP conviennent), requêtes préparées, transactions SQL
- **Tests de sécurité automatisés** : 15 scénarios (auth, CSRF, accès entre tontines, injection SQL, double paiement concurrent, webhooks, uploads, CORS, en-têtes)

```
tontine-platform/
├── backend/     API, schéma SQL (sql/), scripts (migration, admin, sauvegarde), tests
├── frontend/    Interface React
├── SECURITE.md  Correspondance point par point avec le cahier des charges
```

## Installation pas à pas (Windows / PowerShell)

Chaque étape se termine par une **vérification** : ne passez à la suivante que si elle est validée.

### 0. Prérequis
Installez **Node.js 20+** (nodejs.org) et **MySQL ou MariaDB** (par exemple XAMPP : démarrez « MySQL »).

Vérification :
```powershell
node -v          # v20 ou plus
mysql --version  # ou C:\xampp\mysql\bin\mysql.exe --version
```

### 1. Créer la base et le compte à privilèges limités
Ouvrez `backend\sql\db-user.sql`, remplacez `CHANGEZ_MOI...` par un mot de passe long, puis :
```powershell
mysql -u root -p < backend\sql\db-user.sql
```
Vérification : `mysql -u tontine_app -p -e "SHOW DATABASES;"` affiche `tontine`.

### 2. Configurer le backend
```powershell
cd backend
Copy-Item .env.example .env
notepad .env
```
À renseigner : `DB_PASSWORD` (étape 1), `DB_ADMIN_USER` / `DB_ADMIN_PASSWORD` (compte root, utilisé **uniquement** par la migration), et deux secrets aléatoires pour `WEBHOOK_SECRET` et `BACKUP_ENCRYPTION_KEY` :
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
`.env` est dans `.gitignore` : ne le partagez jamais.

### 3. Installer, migrer, créer l'administrateur
```powershell
npm install
npm run migrate
$env:ADMIN_EMAIL="vous@exemple.com"; $env:ADMIN_PASSWORD="UnMotDePasseLong123"; npm run seed
```
Vérification : « Migration terminée : 16 blocs exécutés » puis « Administrateur prêt ».

### 4. Lancer les tests de sécurité (recommandé)
Les tests utilisent une base **séparée**, à créer une fois (adaptez les mots de passe) :
```sql
CREATE DATABASE tontine_test CHARACTER SET utf8mb4;
CREATE USER 'tt_admin'@'%' IDENTIFIED BY 'adminpw'; GRANT ALL ON tontine_test.* TO 'tt_admin'@'%';
CREATE USER 'tt_app'@'%'   IDENTIFIED BY 'apppw';   GRANT SELECT,INSERT,UPDATE,DELETE ON tontine_test.* TO 'tt_app'@'%';
```
```powershell
npm test
```
Vérification : `# pass 15` et `# fail 0`. (Autres identifiants : variables `TEST_DB_HOST`, `TEST_DB_NAME`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, `TEST_DB_ADMIN_USER`, `TEST_DB_ADMIN_PASSWORD`.)

### 5. Démarrer l'API
```powershell
npm run dev
```
Vérification : http://localhost:3001/api/health répond `{"success":true,"data":{"status":"ok"}}`.

### 6. Démarrer le frontend (nouveau terminal)
```powershell
cd frontend
npm install
npm run dev
```
Ouvrez http://localhost:5173 — la page d'accueil s'affiche avec la pièce 3D.

### 7. Parcours de test complet
1. Connectez-vous avec l'administrateur et créez une tontine (« Mes tontines → Nouvelle tontine »).
2. Créez 2 autres comptes via **Créer un compte**. En développement (sans SMTP), les emails sont écrits dans `backend\logs\mail-outbox.log` : copiez le lien de confirmation.
3. Dans la tontine, onglet **Membres** : ajoutez-les par email, ordonnez, **Démarrer**.
4. Onglet **Cotisations** : « Espèces » (trésorier) ou « Payer en ligne » (paiement simulé). Quand un tour est complet : onglet **Tours → Verser**.
5. Onglet **Historique** : numéros de transaction, justificatifs, annulation tracée.
6. Compte admin : **Administration** (utilisateurs, journal d'audit).

## Rôles

| Niveau | Rôle | Droits |
|---|---|---|
| Plateforme | Administrateur | Gère les utilisateurs, lit le journal d'audit, accède à toutes les tontines |
| Par tontine | Gestionnaire | Membres, ordre, démarrage, archivage, encaissements, versements, annulations |
| Par tontine | Trésorier | Encaissements, versements, annulations |
| Par tontine | Membre | Voit ses propres cotisations et transactions, paie en ligne |

## Paiements

- `PAYMENT_PROVIDER=none` : espèces uniquement (le trésorier enregistre les encaissements).
- `PAYMENT_PROVIDER=mock` : simulateur de développement (**refusé en production**).
- Vrai opérateur (FedaPay, KKiaPay, CinetPay, MTN MoMo…) : ajoutez un objet respectant l'interface décrite en tête de `backend/src/services/providers.js` (`createCheckout`, `verify`, `verifySignature`). Webhook signé, anti-doublon et vérification serveur du montant sont déjà en place. **L'adaptateur lui-même n'est pas fourni** : il dépend de votre compte marchand.

## Mise en production

1. Serveur derrière **HTTPS** (nginx, Caddy, hébergeur) ; `NODE_ENV=production`, `TRUST_PROXY=1`, `APP_URL` et `CORS_ORIGINS` en `https://`.
2. `SMTP_*` configurés, `WEBHOOK_SECRET` ≥ 32 caractères, `DB_USER` ≠ root : le serveur **refuse de démarrer** sinon.
3. Frontend : `cd frontend && npm run build`, puis `SERVE_FRONTEND=1` (l'API sert `frontend/dist` avec une CSP stricte), ou hébergement statique séparé.
4. Sauvegardes : `npm run backup` (mysqldump → gzip → AES-256-GCM, rotation `BACKUP_KEEP`). Planification Windows :
   ```powershell
   schtasks /Create /SC DAILY /ST 02:00 /TN "TontineBackup" /TR "cmd /c cd /d C:\chemin\backend && npm run backup"
   ```
   Copiez `backups/` vers un stockage **séparé** du serveur et **testez la restauration** : `node scripts/restore.js backups\xxx.enc restore.sql`, puis chargez `restore.sql` dans une base vide.
5. `npm run audit` (backend et frontend) avant chaque déploiement.
6. Parcourez la checklist du cahier des charges avec `SECURITE.md`.
