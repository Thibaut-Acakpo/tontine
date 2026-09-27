# Correspondance avec le cahier des charges

| § | Exigence | Mise en œuvre |
|---|---|---|
| 2 | Secrets dans `.env` | `backend/.env` ignoré par git, `.env.example` fourni, aucun secret dans le frontend. Sessions serveur opaques (pas de JWT) : aucun secret JWT à protéger |
| 3 | Authentification | Argon2id, confirmation email, réinitialisation (jeton haché, usage unique, 30 min), sessions expirantes et révocables, verrouillage après 5 échecs, rate limiting |
| 4 | Rôles | Vérifiés côté serveur à chaque route (`services/access.js`) ; rôles plateforme + rôles par tontine |
| 5 | Tontines | Création, modification (brouillon), démarrage, archivage, membres, ordre, tours, historique |
| 6 | Finances | Grand livre, n° unique `TXN-AAAAMMJJ-XXXXXXXXXX`, montant lu en base, transactions SQL + verrous, contraintes uniques en base contre les doubles paiements, triggers d'immutabilité, correction par écriture de contrepartie |
| 7 | Base de données | PK/FK/CHECK/index, requêtes préparées, compte applicatif sans DDL (`sql/db-user.sql`). **RLS** : indisponible sous MySQL/MariaDB, compensé par le contrôle d'accès applicatif systématique et les tests inter-tontines |
| 8 | Validation | Schémas zod stricts (champs inattendus rejetés) sur body, query et params |
| 9 | Uploads | 2 Mo max, extension + MIME + octets magiques, nom aléatoire, stockage hors dossier public, accès contrôlé, `nosniff` |
| 10 | API | Auth partout, pagination bornée, codes HTTP, réponses `{success, data\|error}` |
| 11 | CORS | Liste blanche, méthodes et en-têtes limités, credentials |
| 12 | CSRF | Cookie `HttpOnly` + `SameSite` + jeton CSRF lié à la session + contrôle d'`Origin` |
| 13 | HTTPS | Redirection, cookies `Secure` + préfixe `__Host-`, HSTS en production |
| 14, 17 | Erreurs | Messages génériques ; détails uniquement dans `logs/app.log` |
| 15 | Audit | Table `audit_logs` (utilisateur, action, date, ressource, résultat, IP), secrets expurgés |
| 18, 19 | Webhooks / paiements | HMAC-SHA256, table `webhook_events` unique par (fournisseur, événement), re-vérification du statut et du montant auprès du fournisseur |
| 20 | Dépendances | `npm audit` (0 vulnérabilité à la livraison), fichiers de verrouillage versionnés |
| 21 | Emails | Confirmation, réinitialisation, paiements, tours ; limitation d'envois (3/h/utilisateur + rate limit IP) |
| 22 | Sauvegardes | `npm run backup` / `restore` (chiffrées, rotation). Planification et copie hors serveur : à votre charge |
| 23 | Données | Données minimales, anonymisation à la suppression du compte |
| 27 | Tests | `npm test` (15 scénarios) |
| 29 | En-têtes | CSP, nosniff, Referrer-Policy, Permissions-Policy, HSTS |

## Points non couverts ou à compléter

- **2FA administrateur** : « si nécessaire » dans le cahier des charges, non implémentée.
- **Adaptateur d'un vrai opérateur de paiement** : à écrire pour votre opérateur (interface prête, simulateur fourni).
- **Rappels automatiques d'échéance** : les notifications sont déclenchées par les actions (paiement, versement, démarrage), pas par un planificateur.
- **Sauvegardes** : à planifier et copier hors serveur ; restauration à tester chez vous.
- Aucune revue de sécurité externe n'a été faite : à prévoir avant de manipuler de l'argent réel.
