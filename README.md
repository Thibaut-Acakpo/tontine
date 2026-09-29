# 🪙 Tontine — Plateforme de gestion de tontines

> Application web moderne pour digitaliser les tontines : transparence, traçabilité et sécurité.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📖 Description

**Tontine** est une plateforme complète pour gérer les tontines (systèmes d'épargne collective rotative). Elle remplace le cahier papier traditionnel par une solution digitale sécurisée.

### ✨ Fonctionnalités principales

| Fonctionnalité | Description |
|----------------|-------------|
| 🔐 **Authentification complète** | Mot de passe, code PIN, 2FA (Google Authenticator) |
| 👥 **Gestion multi-rôles** | Admin, gestionnaire, trésorier, membre |
| 💰 **Gestion des tontines** | Création, membres, tours, ordre des bénéficiaires |
| 💳 **Paiements** | Enregistrement en espèces, versements aux bénéficiaires |
| 📧 **Notifications** | Email (Gmail SMTP), push (OneSignal) |
| 🌍 **Multilingue** | Français / Anglais |
| 🌓 **Thème** | Sombre / Clair |
| 📊 **Statistiques** | Tableau de bord, graphiques, export PDF |
| 📱 **PWA** | Installable sur mobile |
| 🔔 **Rappels automatiques** | Cron quotidien pour les échéances |

---

## 🛠️ Stack technique

### Frontend
- **React 19** + Vite
- **React Router** (navigation)
- **React-i18next** (multilingue)
- **Recharts** (graphiques)
- **jsPDF + AutoTable** (export PDF)
- **Lucide React** (icônes)
- **PWA** (vite-plugin-pwa)

### Backend
- **Node.js 20+** + Express
- **MariaDB / MySQL** (mysql2)
- **argon2** (hash mots de passe)
- **otplib** (2FA TOTP)
- **nodemailer** (SMTP)
- **@emailjs/nodejs** (fallback emails)
- **node-cron** (tâches planifiées)
- **nodemon** (dev)

---

## 📁 Structure du projet
tontine/
├── backend/ # API REST Node.js
│ ├── src/
│ │ ├── middleware/ # Auth, sécurité, validation
│ │ ├── routes/ # Routes API
│ │ ├── services/ # Logique métier
│ │ ├── utils/ # Utilitaires
│ │ ├── app.js # Configuration Express
│ │ ├── server.js # Point d'entrée
│ │ ├── config.js # Configuration
│ │ ├── db.js # Connexion MySQL
│ │ └── mailer.js # Envoi d'emails
│ ├── scripts/ # Scripts (migrations, backup, seed)
│ ├── sql/ # Fichiers SQL
│ ├── .env.example # Variables d'environnement (modèle)
│ └── package.json
│
├── frontend/ # Interface React
│ ├── src/
│ │ ├── components/ # Composants réutilisables
│ │ ├── pages/ # Pages de l'app
│ │ ├── utils/ # Utilitaires (PDF...)
│ │ ├── App.jsx # Routes
│ │ ├── main.jsx # Point d'entrée
│ │ ├── api.js # Client API
│ │ ├── auth.jsx # Contexte auth
│ │ ├── i18n.js # Traductions
│ │ └── styles.css # Styles globaux
│ ├── public/ # Assets statiques
│ └── package.json
│
└── README.md

text

---

## 🚀 Installation

### Prérequis

- **Node.js** ≥ 20
- **MariaDB** ou **MySQL** ≥ 8
- **npm** ou **yarn**

### 1. Cloner le projet

```bash
git clone https://github.com/Thibaut-Acakpo/tontine.git
cd tontine
2. Backend
bash
cd backend
npm install

# Copier et configurer les variables
cp .env.example .env
# Éditez .env avec vos identifiants
Variables importantes à configurer dans .env :

env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=tontine
DB_USER=votre_user
DB_PASSWORD=votre_password

# Admin (créé au premier seed)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_me

# Email (Gmail SMTP recommandé)
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
Créer la base de données :

bash
# Créer la base dans MySQL
mysql -u root -e "CREATE DATABASE tontine CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Lancer les migrations
npm run migrate

# Créer l'admin
npm run seed

# Démarrer en dev
npm run dev
Backend accessible sur http://localhost:3001.

3. Frontend
bash
cd ../frontend
npm install
npm run dev
Frontend accessible sur http://localhost:5173.

📜 Scripts disponibles
Backend
Script	Description
npm start	Démarrer en production
npm run dev	Démarrer en dev (nodemon)
npm run migrate	Appliquer les migrations
npm run seed	Créer l'admin
npm run backup	Sauvegarder la base
npm run restore	Restaurer une sauvegarde
npm test	Lancer les tests
Frontend
Script	Description
npm run dev	Démarrer Vite en dev
npm run build	Build de production
npm run preview	Prévisualiser le build
🔐 Sécurité
✅ Mots de passe hashés avec argon2id

✅ Sessions avec cookies HttpOnly + CSRF tokens

✅ 2FA disponible pour tous les comptes

✅ Code PIN à 4 chiffres (verrouillage après 3 échecs)

✅ Rate limiting sur les endpoints sensibles

✅ Verrouillage après 5 tentatives échouées

✅ Journal d'audit de toutes les actions

✅ CORS configuré strictement

✅ Helmet pour les headers HTTP

📱 Installation PWA
Android (Chrome)
Ouvrir l'app dans Chrome

Menu → "Ajouter à l'écran d'accueil"

iOS (Safari)
Ouvrir l'app dans Safari

Bouton Partager → "Sur l'écran d'accueil"

🌍 Déploiement
Recommandé
Service	Rôle	Coût
Render	Backend Node.js	Gratuit
Vercel	Frontend React	Gratuit
Railway	Base MySQL	Gratuit
UptimeRobot	Anti cold-start	Gratuit
Étapes rapides
Base de données sur Railway → importer un dump

Backend sur Render → connecter le repo GitHub + variables .env

Frontend sur Vercel → connecter + VITE_API_URL=https://xxx.onrender.com

Anti cold-start : UptimeRobot sur /api/health

📸 Captures d'écran
À ajouter : captures du Dashboard, Tontines, Paiements, Admin

🤝 Contribution
Les contributions sont les bienvenues !

Fork le projet

Créer une branche (git checkout -b feature/ma-feature)

Commit (git commit -m 'Ajout de ma feature')

Push (git push origin feature/ma-feature)

Ouvrir une Pull Request

👤 Auteur
ACAKPO Thibaut

GitHub : @Thibaut-Acakpo

Email : acakpothibaut2@gmail.com

🙏 Remerciements
React

Vite

Express

Lucide Icons

Recharts

<div align="center"> <sub>Fait avec ❤️ pour digitaliser les tontines</sub> </div>
