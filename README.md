# 🪙 Tontine

Plateforme web moderne de gestion des tontines, conçue pour digitaliser l’épargne collective rotative et remplacer la gestion traditionnelle sur cahier.

L’application met l’accent sur la transparence, la traçabilité, la sécurité et la simplicité d’utilisation.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📖 Description

**Tontine** permet de gérer une tontine de manière centralisée.

La plateforme permet notamment de :

* créer et gérer des tontines
* gérer les membres
* définir l’ordre des bénéficiaires
* enregistrer les cotisations
* suivre les paiements
* gérer les versements aux bénéficiaires
* suivre les échéances
* envoyer des notifications
* consulter les statistiques
* exporter les données en PDF
* utiliser l'application sur mobile grâce à la PWA

---

## ✨ Fonctionnalités

### 🔐 Authentification et sécurité

* Authentification par email et mot de passe
* Code PIN à 4 chiffres
* Authentification à deux facteurs avec Google Authenticator
* Verrouillage après plusieurs tentatives échouées
* Sessions sécurisées avec cookies HttpOnly
* Protection CSRF
* Rate limiting
* Journal d'audit
* Protection des routes sensibles
* Headers HTTP sécurisés avec Helmet
* Configuration CORS stricte

### 👥 Gestion des utilisateurs

Plusieurs rôles sont disponibles :

* Administrateur
* Gestionnaire
* Trésorier
* Membre

Chaque rôle possède des permissions adaptées à ses responsabilités.

### 💰 Gestion des tontines

* Création d'une tontine
* Modification des informations
* Gestion des membres
* Ajout et retrait de membres
* Définition des cotisations
* Définition des échéances
* Gestion des tours
* Définition de l'ordre des bénéficiaires
* Suivi de l'état de la tontine

### 💳 Gestion des paiements

* Enregistrement des cotisations
* Paiements en espèces
* Suivi des paiements
* Historique des transactions
* Suivi des versements aux bénéficiaires
* Traçabilité des opérations

### 📧 Notifications

* Notifications par email
* SMTP Gmail
* EmailJS comme solution de secours
* Rappels automatiques
* Notifications liées aux échéances

### 🌍 Multilingue

L'application prend en charge :

* 🇫🇷 Français
* 🇬🇧 Anglais

La gestion des traductions utilise `react-i18next`.

### 🌓 Thème

L'utilisateur peut choisir entre :

* Mode clair
* Mode sombre

### 📊 Tableau de bord et statistiques

* Vue générale de l'activité
* Statistiques des tontines
* Suivi des cotisations
* Suivi des paiements
* Graphiques
* Export des données en PDF

### 📱 Progressive Web App

L'application est installable sur mobile et peut être utilisée comme une application.

#### Android

1. Ouvrir l'application avec Chrome.
2. Ouvrir le menu du navigateur.
3. Sélectionner « Ajouter à l'écran d'accueil ».

#### iOS

1. Ouvrir l'application avec Safari.
2. Appuyer sur le bouton Partager.
3. Sélectionner « Sur l'écran d'accueil ».

### 🔔 Rappels automatiques

Un système de tâches planifiées permet d'exécuter automatiquement certaines opérations, notamment les rappels liés aux échéances.

Technologie utilisée :

`node-cron`

---

# 🛠️ Stack technique

## Frontend

* React 19
* Vite
* React Router
* React-i18next
* Recharts
* jsPDF
* AutoTable
* Lucide React
* vite-plugin-pwa

## Backend

* Node.js 20+
* Express
* MariaDB / MySQL
* mysql2
* argon2
* otplib
* Nodemailer
* @emailjs/nodejs
* node-cron
* Nodemon

---

# 📁 Structure du projet

```text
tontine/
│
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── security.js
│   │   │   └── validation.js
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── tontines.js
│   │   │   ├── members.js
│   │   │   ├── payments.js
│   │   │   └── admin.js
│   │   │
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── tontineService.js
│   │   │   ├── paymentService.js
│   │   │   └── notificationService.js
│   │   │
│   │   ├── utils/
│   │   │   ├── security.js
│   │   │   ├── validation.js
│   │   │   └── helpers.js
│   │   │
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config.js
│   │   ├── db.js
│   │   └── mailer.js
│   │
│   ├── scripts/
│   │   ├── migrate.js
│   │   ├── seed.js
│   │   ├── backup.js
│   │   └── restore.js
│   │
│   ├── sql/
│   │   └── migrations/
│   │
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── api.js
│   │   ├── auth.jsx
│   │   ├── i18n.js
│   │   └── styles.css
│   │
│   ├── public/
│   │   └── assets/
│   │
│   └── package.json
│
├── SECURITE.md
└── README.md
```

---

# 🚀 Installation

## Prérequis

Installez les éléments suivants :

* Node.js 20 ou supérieur
* npm ou Yarn
* MariaDB ou MySQL 8 ou supérieur
* Git

---

## 1. Cloner le projet

```bash
git clone https://github.com/Thibaut-Acakpo/tontine.git
cd tontine
```

---

## 2. Configurer le backend

```bash
cd backend
npm install
```

Copiez le fichier d'environnement :

```bash
cp .env.example .env
```

Puis configurez le fichier `.env`.

### Variables principales

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=tontine
DB_USER=votre_user
DB_PASSWORD=votre_password

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_me

GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

Ne publiez jamais votre fichier `.env` sur GitHub.

---

## 3. Créer la base de données

Avec MySQL :

```bash
mysql -u root -e "CREATE DATABASE tontine CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

## 4. Exécuter les migrations

```bash
npm run migrate
```

---

## 5. Créer le compte administrateur

```bash
npm run seed
```

---

## 6. Démarrer le backend

En développement :

```bash
npm run dev
```

En production :

```bash
npm start
```

Le backend est accessible à :

```text
http://localhost:3001
```

---

# 💻 Installation du frontend

Depuis le dossier racine :

```bash
cd frontend
npm install
```

Démarrer le serveur de développement :

```bash
npm run dev
```

Le frontend est accessible à :

```text
http://localhost:5173
```

---

# 📜 Scripts disponibles

## Backend

| Commande          | Description                          |
| ----------------- | ------------------------------------ |
| `npm start`       | Démarrer le serveur en production    |
| `npm run dev`     | Démarrer le serveur en développement |
| `npm run migrate` | Exécuter les migrations              |
| `npm run seed`    | Créer les données initiales          |
| `npm run backup`  | Sauvegarder la base de données       |
| `npm run restore` | Restaurer une sauvegarde             |
| `npm test`        | Exécuter les tests                   |

## Frontend

| Commande          | Description                    |
| ----------------- | ------------------------------ |
| `npm run dev`     | Démarrer Vite                  |
| `npm run build`   | Générer le build de production |
| `npm run preview` | Prévisualiser le build         |

---

# 🔐 Sécurité

La plateforme intègre plusieurs mécanismes de sécurité :

* Hashage des mots de passe avec Argon2id
* Sessions avec cookies HttpOnly
* Protection CSRF
* Authentification 2FA avec TOTP
* Code PIN à 4 chiffres
* Verrouillage après 3 erreurs de PIN
* Verrouillage après 5 tentatives d'authentification échouées
* Rate limiting sur les endpoints sensibles
* Journalisation des actions
* CORS strict
* Helmet pour les headers HTTP
* Validation des données
* Protection des routes selon les rôles

La documentation complète est disponible dans :

```text
SECURITE.md
```

---

# 🌍 Déploiement

L'architecture recommandée sépare les différents services :

| Service     | Rôle                                |
| ----------- | ----------------------------------- |
| Render      | Backend Node.js                     |
| Vercel      | Frontend React                      |
| Railway     | Base de données MySQL               |
| UptimeRobot | Surveillance et maintien du service |

## Déploiement du backend

1. Connecter le dépôt GitHub à Render.
2. Sélectionner le dossier `backend`.
3. Configurer les variables d'environnement.
4. Déployer le serveur Node.js.
5. Vérifier l'endpoint de santé.

Exemple :

```text
https://votre-backend.onrender.com/api/health
```

## Déploiement du frontend

Configurer le frontend sur Vercel.

La variable suivante doit pointer vers l'URL du backend :

```env
VITE_API_URL=https://votre-backend.onrender.com
```

## Surveillance

UptimeRobot peut surveiller régulièrement :

```text
/api/health
```

Cela permet de détecter rapidement une interruption du backend.

---

# 📊 Fonctionnement général

Le fonctionnement de la plateforme repose sur plusieurs espaces :

```text
Utilisateur
    │
    ▼
Authentification
    │
    ▼
Tableau de bord
    │
    ├── Tontines
    │     ├── Membres
    │     ├── Cotisations
    │     ├── Tours
    │     └── Bénéficiaires
    │
    ├── Paiements
    │     ├── Cotisations
    │     ├── Versements
    │     └── Historique
    │
    ├── Notifications
    │
    ├── Statistiques
    │
    └── Administration
```

---

# 📸 Captures d'écran

Les captures d'écran suivantes seront ajoutées prochainement :

* Tableau de bord
* Gestion des tontines
* Gestion des membres
* Gestion des paiements
* Statistiques
* Administration
* Authentification

---

# 🤝 Contribution

Les contributions sont les bienvenues.

### 1. Forker le projet

### 2. Créer une branche

```bash
git checkout -b feature/ma-feature
```

### 3. Effectuer les modifications

### 4. Créer un commit

```bash
git commit -m "Ajout de ma feature"
```

### 5. Envoyer la branche

```bash
git push origin feature/ma-feature
```

### 6. Ouvrir une Pull Request

---

# 📄 Licence

Ce projet est distribué sous licence MIT.
 
---

# 👤 Auteur

**ACAKPO Thibaut**

GitHub : `@Thibaut-Acakpo`

Email : `acakpothibaut2@gmail.com`

---

# 🙏 Remerciements

Merci aux projets et technologies utilisés pour construire cette plateforme :

* React
* Vite
* Express
* MySQL
* Lucide React
* Recharts
* Node.js

---

<div align="center">

Fait avec ❤️ pour digitaliser la gestion des tontines.

</div>
