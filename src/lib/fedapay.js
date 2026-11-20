/**
 * Fenêtre de paiement FedaPay, côté navigateur.
 *
 * Le moteur est le script `checkout.js` de FedaPay, chargé **à la demande** :
 * la très grande majorité des visiteurs du formulaire ne paie rien (le
 * Ministère de la Justice détient déjà leur bulletin), et un script tiers n'a
 * pas à être chargé sur toutes les pages pour un cas minoritaire. Il n'est donc
 * pas dans `index.html` — il arrive au premier clic sur « Payer ».
 *
 * Ce module ne sait ni ce qui est payé, ni combien : la transaction a été créée
 * par l'API (POST /public/casier/paiement), qui n'a rendu qu'un identifiant et
 * la clé PUBLIQUE. Le montant n'est pas manipulable depuis ici, et le verdict
 * du paiement se demande ensuite à l'API — jamais à cette fenêtre.
 */

const CHECKOUT_JS = 'https://cdn.fedapay.com/checkout.js?v=1.1.7';

let chargement = null;

/**
 * Charge `checkout.js` une seule fois, quel que soit le nombre d'appels.
 * → Promise<FedaPay>, le global installé par le script.
 */
function chargerCheckout() {
  if (window.FedaPay) return Promise.resolve(window.FedaPay);

  if (!chargement) {
    chargement = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_JS;
      script.async = true;
      script.onload = () => {
        if (window.FedaPay) resolve(window.FedaPay);
        else reject(new Error('Le service de paiement ne s’est pas initialisé. Réessayez.'));
      };
      script.onerror = () => {
        // Un nouvel essai doit pouvoir recharger le script : sans cette
        // remise à zéro, l'échec serait définitif pour toute la session.
        chargement = null;
        reject(new Error('Le service de paiement n’a pas pu être chargé. Vérifiez votre connexion, puis réessayez.'));
      };
      document.head.appendChild(script);
    });
  }

  return chargement;
}

/**
 * Ouvre la fenêtre de paiement sur une transaction déjà créée par l'API.
 *
 * @param {{ transactionId: string, publicKey: string, environment: 'sandbox'|'live', devise?: string }} checkout
 *        exactement ce que renvoie POST /public/casier/paiement
 * @returns {Promise<{ ferme: boolean, transaction?: object }>}
 *          `ferme: true` — le demandeur a refermé la fenêtre sans payer. Sinon, il
 *          est allé au bout : reste à demander le verdict à l'API.
 */
export async function ouvrirPaiement(checkout) {
  const FedaPay = await chargerCheckout();

  return new Promise((resolve, reject) => {
    try {
      FedaPay.init({
        public_key: checkout.publicKey,
        environment: checkout.environment || 'sandbox',
        locale: 'fr',
        // Transaction créée côté serveur : le montant et le libellé viennent
        // de là, on ne fait que la rouvrir par son identifiant.
        transaction: { id: Number(checkout.transactionId) || checkout.transactionId },
        currency: { iso: checkout.devise || 'XOF' },
        onComplete: (reponse) => {
          // checkout.js emploie le même rappel pour « payé » et pour
          // « fenêtre refermée » : c'est `reason` qui les distingue.
          const ferme = !!(reponse && FedaPay.DIALOG_DISMISSED && reponse.reason === FedaPay.DIALOG_DISMISSED);
          resolve({ ferme, transaction: reponse && reponse.transaction });
        }
      }).open();
    } catch (err) {
      reject(new Error('La fenêtre de paiement n’a pas pu s’ouvrir. Réessayez.'));
    }
  });
}
