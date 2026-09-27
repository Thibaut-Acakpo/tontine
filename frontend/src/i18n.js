import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  fr: {
    translation: {
      // Menu
      'menu.dashboard': 'Tableau de bord',
      'menu.tontines': 'Mes tontines',
      'menu.payments': 'Paiements',
      'menu.notifications': 'Notifications',
      'menu.profile': 'Profil',
      'menu.settings': 'Paramètres',
      'menu.admin': 'Administration',
      'menu.seeSite': 'Voir le site',
      'menu.logout': 'Déconnexion',
      'menu.search': 'Rechercher...',

      // Commun
      'common.save': 'Enregistrer',
      'common.cancel': 'Annuler',
      'common.delete': 'Supprimer',
      'common.edit': 'Modifier',
      'common.close': 'Fermer',
      'common.confirm': 'Confirmer',
      'common.loading': 'Chargement…',
      'common.yes': 'Oui',
      'common.no': 'Non',
      'common.search': 'Rechercher',
      'common.all': 'Tous',
      'common.none': 'Aucun',
      'common.back': 'Retour',

      // Dashboard
      'dashboard.hello': 'Bonjour, {{name}} 👋',
      'dashboard.activeTontines': 'Tontines actives',
      'dashboard.contributionsDue': 'Cotisations à régler',
      'dashboard.amountOwed': 'Montant dû (FCFA)',
      'dashboard.myTontines': 'Mes tontines',
      'dashboard.toPay': '💸 À payer',
      'dashboard.notifications': '🔔 Notifications',
      'dashboard.seeAll': 'Tout voir →',
      'dashboard.noPending': 'Aucune cotisation en attente 🎉',
      'dashboard.noNotifications': 'Aucune notification',
      'dashboard.myActiveTontines': 'Mes tontines actives',
      'dashboard.noActive': "Vous n'avez encore aucune tontine active.",
      'dashboard.createFirst': 'Créer ou rejoindre une tontine',

      // Auth
      'auth.login': 'Connexion',
      'auth.email': 'Email',
      'auth.password': 'Mot de passe',
      'auth.loginBtn': 'Se connecter',
      'auth.forgotPassword': 'Mot de passe oublié ?',

      // Tontines
      'tontines.title': 'Mes tontines',
      'tontines.new': '+ Nouvelle tontine',
      'tontines.close': '✕ Fermer',
      'tontines.filter': 'Filtrer',
      'tontines.all': 'Toutes',
      'tontines.active': 'Actives',
      'tontines.draft': 'Brouillons',
      'tontines.completed': 'Terminées',
      'tontines.archived': 'Archivées',
      'tontines.empty': "Vous ne participez à aucune tontine.",
      'tontines.createFirst': 'Créer ma première tontine',
      'tontines.deleteConfirm': 'Supprimer cette tontine ? Cette action est définitive.',
      'tontines.deleteBtn': 'Supprimer',

      // Statuts
      'status.active': 'Active',
      'status.draft': 'Brouillon',
      'status.completed': 'Terminée',
      'status.archived': 'Archivée',
      'status.pending': 'En attente',
      'status.paid': 'Payée',
      'status.validated': 'Validée',
      'status.failed': 'Échouée',
      'status.reversed': 'Annulée',
      'status.open': 'Ouvert',
      'status.paid_out': 'Versé',

      // Rôles
      'role.admin': 'Administrateur',
      'role.manager': 'Gestionnaire',
      'role.treasurer': 'Trésorier',
      'role.member': 'Membre',

      // Fréquences
      'freq.weekly': 'Hebdomadaire',
      'freq.biweekly': 'Bimensuelle',
      'freq.monthly': 'Mensuelle',

      // Types
      'type.contribution': 'Cotisation',
      'type.payout': 'Versement',
      'type.reversal': 'Annulation',
      'type.cash': 'Espèces',
      'type.mobile_money': 'Mobile money',

      // Settings
      'settings.title': 'Paramètres',
      'settings.security': '🔐 Sécurité',
      'settings.sessions': '🌐 Sessions',
      'settings.preferences': '🔔 Préférences',
      'settings.danger': '⚠️ Danger',
      'settings.theme': 'Thème',
      'settings.themeDark': 'Sombre',
      'settings.themeLight': 'Clair',
      'settings.language': 'Langue',

      // Search
      'search.placeholder': 'Rechercher une tontine, un membre...',
      'search.noResult': 'Aucun résultat',
      'search.tontines': 'Tontines',
      'search.members': 'Membres',
      'search.transactions': 'Transactions',
    },
  },
  en: {
    translation: {
      'menu.dashboard': 'Dashboard',
      'menu.tontines': 'My tontines',
      'menu.payments': 'Payments',
      'menu.notifications': 'Notifications',
      'menu.profile': 'Profile',
      'menu.settings': 'Settings',
      'menu.admin': 'Administration',
      'menu.seeSite': 'View site',
      'menu.logout': 'Log out',
      'menu.search': 'Search...',

      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.close': 'Close',
      'common.confirm': 'Confirm',
      'common.loading': 'Loading…',
      'common.yes': 'Yes',
      'common.no': 'No',
      'common.search': 'Search',
      'common.all': 'All',
      'common.none': 'None',
      'common.back': 'Back',

      'dashboard.hello': 'Hello, {{name}} 👋',
      'dashboard.activeTontines': 'Active tontines',
      'dashboard.contributionsDue': 'Contributions due',
      'dashboard.amountOwed': 'Amount owed (FCFA)',
      'dashboard.myTontines': 'My tontines',
      'dashboard.toPay': '💸 To pay',
      'dashboard.notifications': '🔔 Notifications',
      'dashboard.seeAll': 'See all →',
      'dashboard.noPending': 'No pending contribution 🎉',
      'dashboard.noNotifications': 'No notification',
      'dashboard.myActiveTontines': 'My active tontines',
      'dashboard.noActive': 'You have no active tontine yet.',
      'dashboard.createFirst': 'Create or join a tontine',

      'auth.login': 'Login',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.loginBtn': 'Login',
      'auth.forgotPassword': 'Forgot password?',

      'tontines.title': 'My tontines',
      'tontines.new': '+ New tontine',
      'tontines.close': '✕ Close',
      'tontines.filter': 'Filter',
      'tontines.all': 'All',
      'tontines.active': 'Active',
      'tontines.draft': 'Drafts',
      'tontines.completed': 'Completed',
      'tontines.archived': 'Archived',
      'tontines.empty': 'You don\'t participate in any tontine.',
      'tontines.createFirst': 'Create my first tontine',
      'tontines.deleteConfirm': 'Delete this tontine? This action is definitive.',
      'tontines.deleteBtn': 'Delete',

      'status.active': 'Active',
      'status.draft': 'Draft',
      'status.completed': 'Completed',
      'status.archived': 'Archived',
      'status.pending': 'Pending',
      'status.paid': 'Paid',
      'status.validated': 'Validated',
      'status.failed': 'Failed',
      'status.reversed': 'Reversed',
      'status.open': 'Open',
      'status.paid_out': 'Paid out',

      'role.admin': 'Administrator',
      'role.manager': 'Manager',
      'role.treasurer': 'Treasurer',
      'role.member': 'Member',

      'freq.weekly': 'Weekly',
      'freq.biweekly': 'Biweekly',
      'freq.monthly': 'Monthly',

      'type.contribution': 'Contribution',
      'type.payout': 'Payout',
      'type.reversal': 'Reversal',
      'type.cash': 'Cash',
      'type.mobile_money': 'Mobile money',

      'settings.title': 'Settings',
      'settings.security': '🔐 Security',
      'settings.sessions': '🌐 Sessions',
      'settings.preferences': '🔔 Preferences',
      'settings.danger': '⚠️ Danger',
      'settings.theme': 'Theme',
      'settings.themeDark': 'Dark',
      'settings.themeLight': 'Light',
      'settings.language': 'Language',

      'search.placeholder': 'Search a tontine, a member...',
      'search.noResult': 'No result',
      'search.tontines': 'Tontines',
      'search.members': 'Members',
      'search.transactions': 'Transactions',
    },
  },
};

// Récupérer la langue depuis localStorage
const savedLang = localStorage.getItem('lang') || 'fr';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
  });

export default i18n;