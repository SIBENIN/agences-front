import React, { useEffect, useState } from 'react';
import { api } from './api/client.js';
import { ReferentielsProvider, useReferentiels } from './context/ReferentielsContext.jsx';
import Hero from './components/Hero.jsx';
import SiteHeader from './components/SiteHeader.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import InscriptionPage from './pages/InscriptionPage.jsx';
import SuiviPage from './pages/SuiviPage.jsx';
import InfosPage, { PAGES_INFOS } from './pages/InfosPage.jsx';

/**
 * Site public du Recensement des agences de voyage : présentation du dispositif
 * puis formulaire d'inscription, le suivi d'un dossier déjà déposé, et les
 * pages d'information (mentions légales, confidentialité, paiement, FAQ).
 */

/**
 * Page d'information demandée par l'adresse, ou `null`.
 *
 * Deux formes, comme pour le suivi : `?page=confidentialite`, qui s'ouvre quel
 * que soit l'hébergement, et `/confidentialite`, plus présentable — celle-ci
 * suppose une règle de réécriture vers `index.html` (cf. `public/.htaccess`).
 * Les liens du site emploient la première : une mention légale doit s'ouvrir
 * même sur un hébergement qui ne réécrit rien.
 */
function pageInfoDepuisUrl() {
  const parametre = new URLSearchParams(window.location.search).get('page');
  if (parametre && PAGES_INFOS[parametre]) return parametre;

  const chemin = window.location.pathname.replace(/^\/|\/$/g, '');
  return PAGES_INFOS[chemin] ? chemin : null;
}

/**
 * Numéro de suivi porté par l'adresse, ou `null` si le visiteur n'est pas sur
 * la page de suivi. Une chaîne vide signifie « page de suivi, sans numéro » —
 * le formulaire de recherche s'affiche alors, vide.
 *
 * Deux formes acceptées : `?suivi=GT-26-…`, celle des liens envoyés par
 * courriel — elle s'ouvre quel que soit l'hébergement, sans règle de
 * réécriture — et `/suivi/GT-26-…`, plus simple à dicter ou à taper.
 */
function numeroDeSuiviDepuisUrl() {
  const parametre = new URLSearchParams(window.location.search).get('suivi');
  if (parametre !== null) return parametre.trim();

  const chemin = window.location.pathname.match(/^\/suivi\/?(.*)$/);
  return chemin ? decodeURIComponent(chemin[1]).trim() : null;
}

/** '2026-10-01' → '1er octobre 2026', sans décalage de fuseau. */
function dateEnToutesLettres(dateIso) {
  const [annee, mois, jour] = String(dateIso).slice(0, 10).split('-').map(Number);
  const moisEtAnnee = new Date(Date.UTC(annee, mois - 1, jour)).toLocaleDateString('fr-FR', {
    month: 'long', year: 'numeric', timeZone: 'UTC'
  });
  return `${jour === 1 ? '1er' : jour} ${moisEtAnnee}`;
}

/**
 * Le formulaire n'apparaît que si l'API déclare le registre ouvert
 * (paramètres pilotés depuis le backoffice). Avant la date d'ouverture, le
 * registre est « programmé » : on annonce la date plutôt qu'une fermeture.
 */
function Contenu() {
  const { chargement, erreur, ouvert, programme, parametres } = useReferentiels();

  if (chargement) {
    return <main className="page-main" id="contenu"><p className="loading-text">Chargement du formulaire…</p></main>;
  }

  if (erreur) {
    return (
      <main className="page-main form-layout" id="contenu">
        <div className="closure-notice card">
          <span className="eyebrow">Recensement des agences de voyage</span>
          <h2>Service momentanément indisponible</h2>
          <p>{erreur}</p>
        </div>
      </main>
    );
  }

  if (!ouvert && programme) {
    return (
      <main className="page-main form-layout" id="contenu">
        {/* `form-start` : le bouton d'inscription du bandeau mène ici tant
            que le formulaire n'est pas encore proposé. */}
        <div className="closure-notice card" id="form-start">
          <span className="eyebrow">Recensement des agences de voyage</span>
          <h2>Ouverture prochaine du recensement</h2>
          {/* Un seul paragraphe : les retours à la ligne du message sont fondus. */}
          <p>
            Le recensement des agences de voyage sera ouvert à partir
            du <strong>{dateEnToutesLettres(parametres.dateOuverture)}</strong>.{' '}
            {String(parametres.messageProgramme || '').replace(/\s+/g, ' ').trim()}
          </p>
        </div>
      </main>
    );
  }

  if (!ouvert) {
    return (
      <main className="page-main form-layout" id="contenu">
        <div className="closure-notice card">
          <span className="eyebrow">Recensement des agences de voyage</span>
          <h2>Recensement fermé</h2>
          <p>{parametres.messageFermeture}</p>
        </div>
      </main>
    );
  }

  return <InscriptionPage />;
}

/** Pied de page de l'accueil : sans lien de suivi tant que le registre est programmé. */
function PiedAccueil() {
  const { ouvert, programme } = useReferentiels();
  return <SiteFooter suivi={!(!ouvert && programme)} />;
}

/** En-tête de l'accueil : sans lien de suivi tant que le registre est programmé. */
function EnteteAccueil() {
  const { ouvert, programme } = useReferentiels();
  return <SiteHeader suivi={!(!ouvert && programme)} superpose />;
}

/**
 * Suivi d'un dossier, sauf quand le registre est programmé : aucun dossier
 * n'a pu être déposé avant l'ouverture, la page annonce donc la date au lieu
 * d'interroger l'API. Seuls les paramètres sont lus — pas les référentiels —
 * et un échec de cette lecture laisse le suivi accessible : fermé ou en
 * panne partielle, c'est là qu'on en a le plus besoin.
 */
function SuiviOuAnnonce({ numeroInitial }) {
  const [etat, setEtat] = useState({ chargement: true, parametres: null });

  useEffect(() => {
    let annule = false;
    api.settings()
      .then((parametres) => { if (!annule) setEtat({ chargement: false, parametres }); })
      .catch(() => { if (!annule) setEtat({ chargement: false, parametres: null }); });
    return () => { annule = true; };
  }, []);

  if (etat.chargement) {
    return <main className="page-main" id="contenu"><p className="loading-text">Chargement…</p></main>;
  }

  const p = etat.parametres;
  const programme = p && !p.open && p.statut === 'programme' && !!p.dateOuverture;
  if (programme) {
    return (
      <main className="page-main form-layout" id="contenu">
        <div className="closure-notice card">
          <span className="eyebrow">Recensement des agences de voyage</span>
          <h2>Suivi de dossier indisponible</h2>
          <p>
            Le recensement des agences de voyage sera ouvert à partir
            du <strong>{dateEnToutesLettres(p.dateOuverture)}</strong>. Le suivi des dossiers
            sera accessible une fois votre demande déposée.
          </p>
          <p><a href="/">Retour à l'accueil</a></p>
        </div>
      </main>
    );
  }

  return <SuiviPage numeroInitial={numeroInitial} />;
}

/**
 * Premier élément atteint à la tabulation : il saute la navigation et les
 * bandeaux pour aller au contenu. Invisible tant qu'il n'a pas le focus.
 */
function LienEvitement() {
  return <a className="skip-link" href="#contenu">Aller au contenu</a>;
}

export default function App() {
  const pageInfo = pageInfoDepuisUrl();
  const numeroSuivi = pageInfo ? null : numeroDeSuiviDepuisUrl();

  // Les pages d'information vivent hors du fournisseur de référentiels, comme
  // le suivi : elles doivent rester consultables quand l'API ne répond pas ou
  // que les inscriptions sont closes — c'est là qu'on cherche une adresse à
  // qui écrire.
  if (pageInfo) {
    return (
      <>
        <LienEvitement />
        <SiteHeader />
        <InfosPage page={pageInfo} />
        <SiteFooter />
      </>
    );
  }

  // Le suivi vit hors du fournisseur de référentiels : il n'a besoin ni des
  // listes de choix ni des paramètres, et il doit rester consultable quand les
  // inscriptions sont closes — c'est même là qu'on en a le plus besoin.
  if (numeroSuivi !== null) {
    return (
      <>
        <LienEvitement />
        <SiteHeader />
        <SuiviOuAnnonce numeroInitial={numeroSuivi} />
        <SiteFooter />
      </>
    );
  }

  return (
    <ReferentielsProvider>
      <LienEvitement />
      <EnteteAccueil />
      <Hero />
      <Contenu />
      <PiedAccueil />
    </ReferentielsProvider>
  );
}
