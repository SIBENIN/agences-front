/**
 * Mesure d'audience Google Analytics 4, soumise au consentement de l'usager.
 *
 * Tant que l'usager n'a pas accepté dans le bandeau, le script de Google n'est
 * pas chargé du tout : aucun cookie `_ga`, aucune requête vers Google. Le mode
 * consentement v2 est déclaré « refusé » par défaut, et seule la mesure
 * d'audience passe à « accordé » après acceptation — jamais la publicité.
 *
 * L'identifiant vient de `VITE_GA_ID` (`.env.production`) : absent, comme sur
 * le poste de développement, la mesure est désactivée et le bandeau ne
 * s'affiche pas — il n'y aurait rien à accepter.
 */

const ID_MESURE = import.meta.env.VITE_GA_ID || '';

const CLE_CONSENTEMENT = 'bj_gt_consentement_audience';

// Le choix est redemandé au bout de six mois.
const DUREE_CONSENTEMENT_MS = 182 * 24 * 60 * 60 * 1000;

const EVENEMENT_OUVRIR_BANDEAU = 'bj-gt:ouvrir-bandeau-cookies';

export const mesureAudienceActive = Boolean(ID_MESURE);

let scriptCharge = false;

/** → 'accepte' | 'refuse' | null (pas encore de choix, ou choix expiré). */
export function lireConsentement() {
  try {
    const choix = JSON.parse(window.localStorage.getItem(CLE_CONSENTEMENT));
    if (!choix || Date.now() - choix.date > DUREE_CONSENTEMENT_MS) return null;
    return choix.valeur === 'accepte' || choix.valeur === 'refuse' ? choix.valeur : null;
  } catch {
    // Stockage bloqué (navigation privée, réglages) : le bandeau se représente.
    return null;
  }
}

export function enregistrerConsentement(accepte) {
  const valeur = accepte ? 'accepte' : 'refuse';
  try {
    window.localStorage.setItem(CLE_CONSENTEMENT, JSON.stringify({ valeur, date: Date.now() }));
  } catch {
    // Le choix vaut au moins pour la page en cours.
  }

  if (!mesureAudienceActive) return;

  if (accepte) {
    chargerGoogleAnalytics();
  } else {
    window.gtag('consent', 'update', { analytics_storage: 'denied' });
    supprimerCookiesGoogleAnalytics();
  }
}

/** Rouvre le bandeau, depuis le lien « Gérer les cookies » du pied de page. */
export function ouvrirBandeauCookies() {
  window.dispatchEvent(new Event(EVENEMENT_OUVRIR_BANDEAU));
}

export function surOuvertureBandeau(rappel) {
  window.addEventListener(EVENEMENT_OUVRIR_BANDEAU, rappel);
  return () => window.removeEventListener(EVENEMENT_OUVRIR_BANDEAU, rappel);
}

/** À appeler une fois, au démarrage, avant le rendu. */
export function demarrerMesureAudience() {
  if (!mesureAudienceActive) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag attend l'objet `arguments`, pas un tableau.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied'
  });

  if (lireConsentement() === 'accepte') chargerGoogleAnalytics();
}

function chargerGoogleAnalytics() {
  if (scriptCharge) return;
  scriptCharge = true;

  window.gtag('consent', 'update', { analytics_storage: 'granted' });
  window.gtag('js', new Date());
  window.gtag('config', ID_MESURE, { page_location: adresseSansNumeroDeSuivi() });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID_MESURE)}`;
  document.head.appendChild(script);
}

/**
 * Adresse de la page transmise à Google, sans le numéro de dossier que portent
 * les liens de suivi (`?suivi=GT-26-…`, `/suivi/GT-26-…`) : il identifie un
 * guide, et n'a rien à faire dans un outil de statistiques.
 */
function adresseSansNumeroDeSuivi() {
  const adresse = new URL(window.location.href);
  if (adresse.searchParams.has('suivi')) adresse.searchParams.set('suivi', '');
  adresse.pathname = adresse.pathname.replace(/^\/suivi\/.+$/, '/suivi');
  return adresse.toString();
}

function supprimerCookiesGoogleAnalytics() {
  const domaine = window.location.hostname.split('.').slice(-2).join('.');

  document.cookie
    .split(';')
    .map((cookie) => cookie.split('=')[0].trim())
    .filter((nom) => nom === '_ga' || nom.startsWith('_ga_'))
    .forEach((nom) => {
      for (const attributDomaine of ['', `; domain=.${domaine}`]) {
        document.cookie = `${nom}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${attributDomaine}`;
      }
    });
}
