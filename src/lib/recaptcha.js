/**
 * Filtre anti-robot Google reCAPTCHA v3, côté navigateur.
 *
 * La v3 n'affiche rien à cocher : juste avant un appel sensible (dépôt du
 * dossier, envoi d'un code par SMS), on demande à Google un jeton pour une
 * action nommée, et l'API le fait vérifier avec la clé secrète.
 *
 * La clé du site n'est pas compilée dans le bundle : elle arrive de l'API
 * (`recaptchaSiteKey` dans GET /public/settings). Nulle, la vérification est
 * désactivée côté serveur, et le script de Google n'est pas chargé du tout.
 */

let chargement = null;

function chargerScript(siteKey) {
  if (window.grecaptcha && window.grecaptcha.execute) return Promise.resolve(window.grecaptcha);

  if (!chargement) {
    chargement = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}&hl=fr`;
      script.async = true;
      script.onload = () => {
        if (window.grecaptcha) window.grecaptcha.ready(() => resolve(window.grecaptcha));
        else reject(new Error('La vérification anti-robot ne s’est pas initialisée. Rechargez la page.'));
      };
      script.onerror = () => {
        // Un nouvel essai doit pouvoir recharger le script.
        chargement = null;
        reject(new Error('La vérification anti-robot n’a pas pu être chargée. Vérifiez votre connexion, puis réessayez.'));
      };
      document.head.appendChild(script);
    });
  }

  return chargement;
}

/**
 * Charge le script dès que la clé est connue : Google évalue mieux un visiteur
 * qu'il a vu naviguer qu'un visiteur apparu au moment de valider.
 */
export function prechargerRecaptcha(siteKey) {
  if (siteKey) chargerScript(siteKey).catch(() => {});
}

/**
 * Jeton pour `action` (mêmes noms que côté API : `depot_demande`,
 * `npi_lookup`). → Promise<string|null> ; null si reCAPTCHA est désactivé.
 * Le jeton expire en deux minutes et ne sert qu'une fois : à demander
 * immédiatement avant chaque appel.
 */
export async function jetonRecaptcha(siteKey, action) {
  if (!siteKey) return null;
  const grecaptcha = await chargerScript(siteKey);
  return grecaptcha.execute(siteKey, { action });
}
