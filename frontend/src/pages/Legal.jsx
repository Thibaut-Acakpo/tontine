import { Link } from 'react-router-dom';

// Layout commun pour les pages légales
function LegalShell({ title, children }) {
  return (
    <div className="pub">
      <nav className="pubnav">
        <Link to="/" className="brand"><i>₣</i> Tontine</Link>
        <div className="row">
          <Link className="btn ghost" to="/">← Retour à l'accueil</Link>
        </div>
      </nav>
      <div className="legal-page">
        <h1>{title}</h1>
        <p className="mut sm" style={{ marginBottom: '2rem' }}>
          Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <div className="legal-content">{children}</div>
      </div>
      <footer className="landing-footer" style={{ marginTop: '4rem' }}>
        <div className="footer-bottom">
          <span className="mut sm">© {new Date().getFullYear()} Tontine · Tous droits réservés.</span>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// POLITIQUE DE CONFIDENTIALITÉ
// ============================================================
export function Privacy() {
  return (
    <LegalShell title="Politique de confidentialité">
      <section>
        <h2>1. Introduction</h2>
        <p>
          La présente politique décrit la manière dont <b>Tontine</b> collecte, utilise
          et protège vos données personnelles. Nous nous engageons à respecter votre vie privée
          et à traiter vos données de manière transparente et sécurisée.
        </p>
      </section>

      <section>
        <h2>2. Données collectées</h2>
        <p>Nous collectons les catégories de données suivantes :</p>

        <h3>2.1 Données que vous nous fournissez</h3>
        <ul>
          <li><b>Identité</b> : nom complet</li>
          <li><b>Coordonnées</b> : adresse email, numéro de téléphone</li>
          <li><b>Authentification</b> : mot de passe (hashé), code PIN (hashé), secret 2FA</li>
          <li><b>Données de tontine</b> : membres, cotisations, versements, historiques</li>
        </ul>

        <h3>2.2 Données collectées automatiquement</h3>
        <ul>
          <li><b>Données de connexion</b> : adresse IP, navigateur, date et heure</li>
          <li><b>Sessions actives</b> : appareils connectés</li>
          <li><b>Journaux d'audit</b> : actions effectuées sur le compte</li>
        </ul>
      </section>

      <section>
        <h2>3. Utilisation des données</h2>
        <p>Vos données sont utilisées pour :</p>
        <ul>
          <li>Vous authentifier et sécuriser votre compte</li>
          <li>Gérer vos tontines et les transactions associées</li>
          <li>Vous envoyer des notifications (rappels, confirmations, alertes)</li>
          <li>Prévenir la fraude et les abus</li>
          <li>Améliorer le service</li>
        </ul>
      </section>

      <section>
        <h2>4. Base légale</h2>
        <p>Le traitement repose sur :</p>
        <ul>
          <li><b>L'exécution du contrat</b> (utilisation du service)</li>
          <li><b>Votre consentement</b> (notifications marketing, si applicable)</li>
          <li><b>Notre intérêt légitime</b> (sécurité, prévention de la fraude)</li>
          <li><b>Obligations légales</b> (conservation comptable)</li>
        </ul>
      </section>

      <section>
        <h2>5. Conservation des données</h2>
        <p>Vos données sont conservées pendant la durée de votre compte, puis :</p>
        <ul>
          <li><b>Données personnelles</b> : anonymisées 30 jours après suppression du compte</li>
          <li><b>Données financières</b> : conservées 10 ans pour respecter les obligations comptables</li>
          <li><b>Journaux d'audit</b> : conservés 3 ans</li>
        </ul>
      </section>

      <section>
        <h2>6. Partage des données</h2>
        <p>Vos données ne sont <b>jamais vendues</b>. Elles peuvent être partagées avec :</p>
        <ul>
          <li>Les autres <b>membres de vos tontines</b> (nom, montant cotisé, statut)</li>
          <li>Les <b>prestataires techniques</b> (hébergeur, service d'email) — sous contrat de confidentialité</li>
          <li>Les <b>autorités</b> en cas d'obligation légale</li>
        </ul>
      </section>

      <section>
        <h2>7. Vos droits</h2>
        <p>Conformément à la réglementation applicable, vous disposez des droits suivants :</p>
        <ul>
          <li><b>Accès</b> : consulter vos données</li>
          <li><b>Rectification</b> : corriger vos données</li>
          <li><b>Effacement</b> : supprimer votre compte (anonymisation)</li>
          <li><b>Portabilité</b> : exporter vos données</li>
          <li><b>Opposition</b> : refuser certains traitements</li>
          <li><b>Limitation</b> : restreindre le traitement</li>
        </ul>
        <p>
          Pour exercer ces droits, contactez-nous à :{' '}
          <span className="legal-placeholder">acakpothibaut2@gmail.com</span>
        </p>
      </section>

      <section>
        <h2>8. Cookies</h2>
        <p>Tontine utilise uniquement des cookies strictement nécessaires :</p>
        <ul>
          <li><b>Cookie de session</b> : pour vous garder connecté (HttpOnly, SameSite)</li>
          <li><b>Cookie CSRF</b> : protection contre les attaques CSRF</li>
        </ul>
        <p><b>Aucun cookie publicitaire ou de tracking tiers</b> n'est utilisé.</p>
      </section>

      <section>
        <h2>9. Sécurité</h2>
        <p>Nous mettons en œuvre les mesures suivantes :</p>
        <ul>
          <li>Chiffrement des mots de passe (argon2id)</li>
          <li>Connexion HTTPS obligatoire</li>
          <li>Authentification à deux facteurs (2FA) disponible</li>
          <li>Journalisation des accès</li>
          <li>Verrouillage après plusieurs tentatives échouées</li>
        </ul>
      </section>

      <section>
        <h2>10. Modifications</h2>
        <p>
          Cette politique peut être mise à jour. La date de dernière modification est indiquée
          en haut de cette page. En cas de changement important, vous serez notifié par email.
        </p>
      </section>
    </LegalShell>
  );
}

// ============================================================
// CONDITIONS GÉNÉRALES D'UTILISATION
// ============================================================
export function Terms() {
  return (
    <LegalShell title="Conditions Générales d'Utilisation">
      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation
          de la plateforme <b>Tontine</b>, un service de gestion digitale de tontines.
        </p>
        <p>En créant un compte, vous acceptez sans réserve les présentes CGU.</p>
      </section>

      <section>
        <h2>2. Définitions</h2>
        <ul>
          <li><b>Plateforme</b> : le service Tontine accessible en ligne</li>
          <li><b>Utilisateur</b> : toute personne ayant un compte</li>
          <li><b>Tontine</b> : groupe d'épargne collective rotative</li>
          <li><b>Gestionnaire</b> : créateur et administrateur d'une tontine</li>
          <li><b>Membre</b> : participant à une tontine</li>
        </ul>
      </section>

      <section>
        <h2>3. Accès au service</h2>
        <p>
          L'accès à la plateforme est réservé aux personnes majeures et capables.
          Le compte est créé par un administrateur de la plateforme ou par un gestionnaire de tontine.
        </p>
        <p>
          L'utilisateur s'engage à fournir des informations exactes et à maintenir la
          confidentialité de ses identifiants.
        </p>
      </section>

      <section>
        <h2>4. Compte utilisateur</h2>
        <p>Chaque utilisateur est responsable :</p>
        <ul>
          <li>De la confidentialité de son mot de passe, PIN et code 2FA</li>
          <li>De toutes les actions effectuées depuis son compte</li>
          <li>De signaler immédiatement toute utilisation non autorisée</li>
        </ul>
        <p>
          L'utilisateur peut activer des protections supplémentaires (2FA, code PIN)
          depuis les paramètres de son compte.
        </p>
      </section>

      <section>
        <h2>5. Obligations de l'utilisateur</h2>
        <p>L'utilisateur s'engage à ne pas :</p>
        <ul>
          <li>Utiliser la plateforme à des fins illégales ou frauduleuses</li>
          <li>Porter atteinte à la sécurité ou au fonctionnement du service</li>
          <li>Tenter d'accéder aux comptes d'autres utilisateurs</li>
          <li>Contourner les mesures de sécurité</li>
          <li>Créer de faux comptes ou usurper une identité</li>
        </ul>
      </section>

      <section>
        <h2>6. Fonctionnement des tontines</h2>
        <p>
          Tontine est un <b>outil de gestion</b>. La plateforme ne détient pas les fonds et
          n'est pas partie prenante aux accords entre membres d'une tontine.
        </p>
        <p>
          Les gestionnaires sont responsables du bon fonctionnement de leurs tontines
          (montants, fréquence, ordre des bénéficiaires).
        </p>
        <p>Les litiges entre membres d'une tontine relèvent de leur responsabilité.</p>
      </section>

      <section>
        <h2>7. Paiements</h2>
        <p>Les paiements peuvent être effectués :</p>
        <ul>
          <li><b>En ligne</b> via un fournisseur de paiement partenaire</li>
          <li><b>En espèces</b>, enregistré manuellement par un gestionnaire</li>
        </ul>
        <p>Tontine ne peut être tenu responsable des défaillances des fournisseurs de paiement.</p>
      </section>

      <section>
        <h2>8. Responsabilité</h2>
        <p>
          La plateforme est fournie <b>« en l'état »</b>. Nous nous efforçons d'assurer une
          disponibilité maximale mais ne pouvons garantir une absence totale d'interruption.
        </p>
        <p>Tontine ne saurait être tenu responsable :</p>
        <ul>
          <li>Des dommages indirects liés à l'utilisation du service</li>
          <li>De la perte de données due à un cas de force majeure</li>
          <li>Des conflits entre membres d'une tontine</li>
        </ul>
      </section>

      <section>
        <h2>9. Propriété des données</h2>
        <p>L'utilisateur reste propriétaire de ses données. Il peut à tout moment :</p>
        <ul>
          <li>Exporter ses données</li>
          <li>Supprimer son compte (anonymisation)</li>
        </ul>
        <p>
          L'historique financier des tontines est conservé après suppression pour
          préserver l'intégrité du livre de comptes.
        </p>
      </section>

      <section>
        <h2>10. Résiliation</h2>
        <p>
          Un utilisateur peut supprimer son compte à tout moment depuis les paramètres,
          sauf s'il participe à une tontine en cours.
        </p>
        <p>Un administrateur peut suspendre ou supprimer un compte en cas de :</p>
        <ul>
          <li>Violation des CGU</li>
          <li>Activité frauduleuse</li>
          <li>Demande légale</li>
        </ul>
      </section>

      <section>
        <h2>11. Modification des CGU</h2>
        <p>
          Les CGU peuvent être modifiées à tout moment. Les utilisateurs seront informés
          par email en cas de changement majeur. La poursuite de l'utilisation vaut acceptation.
        </p>
      </section>

      <section>
        <h2>12. Droit applicable</h2>
        <p>
          Les présentes CGU sont soumises au droit de :{' '}
          <span className="legal-placeholder">[À COMPLÉTER — ex: Bénin, France...]</span>.
        </p>
        <p>En cas de litige, une solution amiable sera recherchée en priorité.</p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>
          Pour toute question relative aux CGU :{' '}
          <span className="legal-placeholder">[À COMPLÉTER]</span>
        </p>
      </section>
    </LegalShell>
  );
}