/**
 * Client de l'API publique (../agences-api). Aucune authentification : les
 * routes sont ouvertes, protégées par limitation de débit, reCAPTCHA et URL
 * signées pour les pièces jointes.
 *
 * `/api` par défaut : formulaire et API servis sur le même domaine.
 */
const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...options.headers }
  });

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    // corps vide ou non JSON
  }

  if (!res.ok) {
    const erreur = new Error((data && data.message) || 'Une erreur est survenue.');
    erreur.status = res.status;
    erreur.errors = data && data.errors;
    erreur.data = data;
    throw erreur;
  }
  return data;
}

/** Appel d'une URL signée remise par l'API (absolue, déjà complète). */
async function signee(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { Accept: 'application/json', ...options.headers } });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const erreur = new Error((data && data.message) || 'La requête a échoué.');
    erreur.status = res.status;
    throw erreur;
  }
  return data;
}

export const api = {
  settings() {
    return request('/public/settings');
  },

  referentiels() {
    return request('/public/referentiels');
  },

  npiLookup(npi, recaptchaToken = null) {
    return request('/public/npi/lookup', { method: 'POST', body: JSON.stringify({ npi, recaptchaToken }) });
  },

  npiResend(requestId) {
    return request('/public/npi/resend', { method: 'POST', body: JSON.stringify({ requestId }) });
  },

  npiConfirm(requestId, otp) {
    return request('/public/npi/confirm', { method: 'POST', body: JSON.stringify({ requestId, otp }) });
  },

  ifuVerify(ifu) {
    return request('/public/ifu/verify', { method: 'POST', body: JSON.stringify({ ifu }) });
  },

  /**
   * Entreprises rattachées au NPI vérifié (APIEX). La preuve de vérification
   * du NPI est exigée : sans elle, l'API répond 403.
   */
  apiexEntreprises(npi, verificationToken) {
    return request('/public/apiex/entreprises', { method: 'POST', body: JSON.stringify({ npi, verificationToken }) });
  },

  /** Casier judiciaire du représentant (CNCJ) et frais dus → { casier, montants, paiement } */
  casierVerify(npi, verificationToken, force = false) {
    return request('/public/casier/verify', { method: 'POST', body: JSON.stringify({ npi, verificationToken, force }) });
  },

  /** Ouverture du paiement FedaPay des frais → checkout, ou { dejaRegle, paiement }. */
  paiementOuvrir(demande) {
    return request('/public/paiement', { method: 'POST', body: JSON.stringify(demande) });
  },

  /** Verdict d'un paiement, redemandé à FedaPay par l'API. */
  paiementVerifier(npi, verificationToken, transactionId) {
    return request('/public/paiement/verifier', {
      method: 'POST',
      body: JSON.stringify({ npi, verificationToken, transactionId })
    });
  },

  deposerDemande(payload) {
    return request('/public/demandes', { method: 'POST', body: JSON.stringify(payload) });
  },

  /** Les pièces sont parties : l'API envoie l'accusé de réception. */
  finaliser(finalisationUrl) {
    return signee(finalisationUrl, { method: 'POST' });
  },

  suivre(trackingId) {
    return request(`/public/demandes/${encodeURIComponent(trackingId)}`);
  },

  complementDemanderCode(trackingId) {
    return request(`/public/demandes/${encodeURIComponent(trackingId)}/complement/code`, { method: 'POST' });
  },

  complementVerifierCode(trackingId, code) {
    return request(`/public/demandes/${encodeURIComponent(trackingId)}/complement/verification`, {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  },


  televerserPiece(uploadUrl, type, file) {
    const form = new FormData();
    form.append('type', type);
    form.append('file', file);
    return signee(uploadUrl, { method: 'POST', body: form });
  }
};
