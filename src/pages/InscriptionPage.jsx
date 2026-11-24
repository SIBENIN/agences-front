import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useReferentiels } from '../context/ReferentielsContext.jsx';
import { Dropzone, Field, Status } from '../components/FormControls.jsx';
import { EXPERIENCES_MAX_DEFAUT, PIECES, PIECES_MULTIPLES, piecesRequises } from '../lib/pieces.js';
import { jetonRecaptcha, prechargerRecaptcha } from '../lib/recaptcha.js';
import { ouvrirPaiement } from '../lib/fedapay.js';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import libellesPays from 'react-phone-number-input/locale/fr';
import 'react-phone-number-input/style.css';

/**
 * Formulaire public de recensement des agences de voyage et de tourisme :
 * demande de licence d'agence de voyage et de tourisme.
 *
 * Les chapitres reprennent ceux du scénario de demande de licence (étape 3,
 * « Ouverture et remplissage du formulaire ») : information sur la demande,
 * représentant légal, agence de voyage, implantation, statut vis-à-vis de
 * l'administration et documents à joindre, puis l'engagement.
 *
 * Le dossier part vers l'API (`POST /api/public/demandes`), les pièces
 * suivent par l'URL signée renvoyée par ce dépôt, puis l'API envoie
 * l'accusé de réception (`finalisationUrl`).
 */

const DRAFT_KEY = 'bj_av_public_draft';

const STEP_INFO = [
  'Représentant légal et gérant',
  "Informations sur l'agence",
  "Implantation de l'agence",
  'Pièces et casier',
  'Engagement et envoi'
];
const STEP_COUNT = STEP_INFO.length;

/**
 * Consentement au partage des données, à la suite des engagements du
 * référentiel : une mention de conformité du formulaire, pas un engagement
 * métier. Coché dans le même tableau `engagements`, en dernière position.
 */
const CONSENTEMENT_APDP =
  "J'autorise le partage des données de ce dossier avec les administrations concernées pour les besoins du recensement, conformément à la réglementation sur la protection des données à caractère personnel (APDP).";

/** Identité du gérant quand ce n'est pas le représentant légal (RNPP). */
const GERANT_VIDE = {
  gerantNpi: '', gerantNom: '', gerantPrenom: '', gerantNaissance: '', gerantSexe: '', gerantNationalite: '',
  gerantTel: '', gerantAdresse: '', gerantEmail: '', gerantPhoto: '', gerantNpiVerification: ''
};

function emptyData(nbEngagements = 2) {
  return {
    // Représentant légal (RNPP)
    npi: '', nom: '', prenom: '', naissance: '', sexe: '', nationalite: '', tel: '', adresse: '', email: '',
    photoRnpp: '', npiVerification: '',
    // Gérant : '' (pas encore répondu) | 'oui' (le représentant légal) |
    // 'non' (une autre personne, identifiée à son tour au RNPP).
    gerantEstRepresentant: '',
    ...GERANT_VIDE,
    // Agence. `entrepriseApiex` : identifiant de l'entreprise retenue parmi
    // celles que l'APIEX rattache au NPI (vide : saisie manuelle).
    entrepriseApiex: '', saisieManuelle: false,
    raisonSociale: '', rccm: '', ifu: '', nomCommercial: '', telAgence: '', anneeDemarrage: '',
    categorie: '', regime: '', regimeAutre: '',
    // Implantation
    typeStructure: '', departement: '', commune: '', arrondissement: '', quartier: '', carreMaison: '',
    lotReference: '', gpsLatitude: '', gpsLongitude: '', indicationGeo: '', siteWeb: '', adressePostale: '',
    engagements: Array(nbEngagements).fill(false),
    // Fichiers, par clé de pièce : toujours une liste (un fichier pour les
    // pièces simples). Ils ne survivent pas au brouillon.
    uploads: {}
  };
}

const EMAIL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
const vide = (v) => v === undefined || v === null || !String(v).trim();


/** Champs sans lesquels on ne peut pas quitter une étape. */
function champsRequisManquants(n, d, ctx) {
  const m = [];
  const exiger = (champ) => { if (vide(d[champ])) m.push(champ); };

  if (n === 1) {
    if (!d.npiVerification) m.push('npi');
    exiger('email');
    // Gérant : demandé dès l'étape 1, juste après le représentant légal.
    if (!d.gerantEstRepresentant) m.push('gerant');
    if (d.gerantEstRepresentant === 'non' && !d.gerantNpiVerification) m.push('gerantNpi');
  } else if (n === 2) {
    if (ctx.apiex?.phase === 'loading') m.push('apiex');
    if (ctx.apiex?.phase === 'done' && ctx.apiex.entreprises.length > 1 && !d.entrepriseApiex && !d.saisieManuelle) {
      m.push('entreprise');
    }
    ['raisonSociale', 'rccm', 'nomCommercial', 'telAgence', 'anneeDemarrage', 'categorie', 'regime'].forEach(exiger);
    if (d.regime === 'autre') exiger('regimeAutre');
  } else if (n === 3) {
    exiger('typeStructure');
    if (d.typeStructure === 'physique') {
      ['departement', 'commune', 'arrondissement', 'quartier'].forEach(exiger);
      exiger('indicationGeo');
    }
    if (d.typeStructure === 'en_ligne') exiger('siteWeb');
  } else if (n === 4) {
    if (ctx.casier?.phase !== 'done') m.push('casier');
    piecesRequises(d).forEach((cle) => {
      if (!(d.uploads[cle] || []).length) m.push('piece-' + cle);
    });
  } else if (n === 5) {
    for (let i = 0; i < ctx.nbEngagements; i++) {
      if (!d.engagements[i]) m.push('engagement-' + i);
    }
  }
  return m;
}

/** Valeurs saisies mais malformées. */
function validateStep(n, d) {
  const err = {};
  if (n === 1 && !vide(d.email) && !EMAIL_RE.test(String(d.email).trim())) err.email = 'Adresse email invalide';
  if (n === 1 && d.gerantEstRepresentant === 'non') {
    if (!vide(d.gerantEmail) && !EMAIL_RE.test(String(d.gerantEmail).trim())) err.gerantEmail = 'Adresse email invalide';
    if (!vide(d.gerantNpi) && String(d.gerantNpi).trim() === String(d.npi).trim()) {
      err.gerantNpi = 'Ce NPI est celui du représentant légal : répondez « Oui » à la question précédente.';
    }
  }
  // Numéro au format international (+229…), contrôlé selon le plan de
  // numérotation du pays choisi.
  if (n === 2 && !vide(d.telAgence) && !isValidPhoneNumber(String(d.telAgence))) err.telAgence = 'Numéro de téléphone invalide pour ce pays';
  if (n === 3) {
    const lat = Number(String(d.gpsLatitude).replace(',', '.'));
    const lng = Number(String(d.gpsLongitude).replace(',', '.'));
    if (!vide(d.gpsLatitude) && (Number.isNaN(lat) || lat < -90 || lat > 90)) err.gpsLatitude = 'Latitude invalide';
    if (!vide(d.gpsLongitude) && (Number.isNaN(lng) || lng < -180 || lng > 180)) err.gpsLongitude = 'Longitude invalide';
    if (vide(d.gpsLatitude) !== vide(d.gpsLongitude)) err.gpsLatitude = 'Renseignez la latitude et la longitude';
    if (!vide(d.siteWeb) && !/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(String(d.siteWeb).trim())) err.siteWeb = 'Adresse de site invalide';
  }
  return err;
}

const nombre = (v) => (vide(v) ? null : Number(String(v).replace(',', '.')));

/** Choix exclusif rendu en cartes (catégorie, régime, type de structure…). */
function Choix({ name, options, value, onChange, colonnes }) {
  return (
    <div className={'choice-row choice-row--wrap' + (colonnes ? ` choice-row--${colonnes}` : '')} role="radiogroup">
      {options.map((opt) => (
        <label className={'choice-card choice-card--boxed' + (value === opt.value ? ' is-checked' : '')} key={opt.value}>
          <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)} />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

const formatMontant = (n) => (n || n === 0 ? new Intl.NumberFormat('fr-FR').format(n) + ' FCFA' : '—');

const libelle = (options, valeur) => (options.find((o) => o.value === valeur) || {}).label || valeur || '—';

export default function InscriptionPage() {
  const {
    departements, communesParDepartement, engagements: engagementsRef, categories, regimes,
    typesStructure, anneeDemarrageMin, experiencesMax, parametres
  } = useReferentiels();

  const engagementsAffiches = [...engagementsRef, CONSENTEMENT_APDP];
  const maxExperiences = Number(experiencesMax) || EXPERIENCES_MAX_DEFAUT;

  const [step, setStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [data, setData] = useState(() => emptyData(engagementsAffiches.length));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [created, setCreated] = useState(null);

  // NPI / RNPP
  const [npiPhase, setNpiPhase] = useState('idle'); // idle | loading | otp | verifying | verified
  const [npiStatus, setNpiStatus] = useState(null);
  const [npiSession, setNpiSession] = useState(null);
  const [otpValue, setOtpValue] = useState('');
  // NPI du gérant, quand ce n'est pas le représentant légal : même parcours
  // (code envoyé au téléphone du gérant inscrit au RNPP).
  const [gerantPhase, setGerantPhase] = useState('idle'); // idle | loading | otp | verifying | verified
  const [gerantStatus, setGerantStatus] = useState(null);
  const [gerantSession, setGerantSession] = useState(null);
  const [gerantOtp, setGerantOtp] = useState('');
  // IFU / DGI : dernier IFU réellement soumis à la DGI.
  const [ifuStatus, setIfuStatus] = useState(null);
  const [ifuLoading, setIfuLoading] = useState(false);
  const [ifuVerifie, setIfuVerifie] = useState('');
  const [gpsStatus, setGpsStatus] = useState(null);
  // APIEX : entreprises rattachées au NPI vérifié.
  // phase : idle | loading | done | echec | sans-npi
  const [apiex, setApiex] = useState({ phase: 'idle', npi: '', entreprises: [], message: '' });
  // Casier judiciaire du représentant (CNCJ) et frais dus.
  // phase : idle | loading | done | echec | sans-npi
  const [casier, setCasier] = useState({ phase: 'idle' });
  const [montants, setMontants] = useState(null);
  // Frais réglés et vérifiés par l'API ({ montant, reference, … }) : le
  // dépôt l'exige. Relu à l'API à chaque reprise, jamais du brouillon.
  const [paiement, setPaiement] = useState(null);
  const [paiementStatus, setPaiementStatus] = useState(null);
  // Transaction FedaPay ouverte et pas encore conclue : gardée au brouillon
  // pour la reprendre (onglet fermé pendant la confirmation de l'opérateur,
  // retour d'un 3-D Secure bancaire) au lieu d'en ouvrir une seconde.
  const [transactionEnCours, setTransactionEnCours] = useState(null);
  const paiementRepris = useRef(false);

  const restored = useRef(false);
  const recaptchaSiteKey = parametres.recaptchaSiteKey;
  useEffect(() => { prechargerRecaptcha(recaptchaSiteKey); }, [recaptchaSiteKey]);

  const anneeCourante = new Date().getFullYear();
  const annees = [];
  for (let a = anneeCourante; a >= (Number(anneeDemarrageMin) || 1960); a--) annees.push(a);

  const communesProposees = communesParDepartement[data.departement] || [];
  const pieces = piecesRequises(data);

  // --- brouillon local ------------------------------------------------------

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const base = emptyData(engagementsAffiches.length);
        const merged = {
          ...base,
          ...saved.data,
          uploads: {},
          engagements: (saved.data && saved.data.engagements) || base.engagements
        };
        setData(merged);
        setStep(Math.min(saved.step || 1, STEP_COUNT));
        setMaxStepReached(Math.min(saved.maxStepReached || 1, STEP_COUNT));
        if (saved.ifuVerifie) setIfuVerifie(saved.ifuVerifie);
        if (saved.apiex && saved.apiex.phase === 'done') setApiex(saved.apiex);
        if (saved.transactionEnCours) setTransactionEnCours(saved.transactionEnCours);
        if (saved.npiVerified && merged.npi && merged.npiVerification) {
          setNpiPhase('verified');
          setNpiStatus({ kind: 'success', text: '✓ Identité confirmée et retrouvée au RNPP (ANIP).' });
        }
        if (merged.gerantEstRepresentant === 'non' && merged.gerantNpiVerification) {
          setGerantPhase('verified');
          setGerantStatus({ kind: 'success', text: '✓ Identité du gérant confirmée et retrouvée au RNPP (ANIP).' });
        }
      }
    } catch (err) {
      // brouillon illisible -> on repart de zéro
    }
    restored.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored.current || created) return;
    const { uploads, photoRnpp, gerantPhoto, ...sansFichiers } = data;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        step, maxStepReached, data: sansFichiers, ifuVerifie, npiVerified: npiPhase === 'verified',
        apiex: apiex.phase === 'done' ? apiex : null,
        transactionEnCours
      }));
    } catch (err) {
      // stockage indisponible (navigation privée) : pas de brouillon
    }
  }, [step, maxStepReached, data, ifuVerifie, npiPhase, apiex, transactionEnCours, created]);

  // --- helpers d'état -------------------------------------------------------

  function patch(fields) {
    setData((d) => ({ ...d, ...fields }));
  }

  function setUpload(cle, fichiers) {
    setData((d) => ({ ...d, uploads: { ...d.uploads, [cle]: fichiers } }));
  }

  function toggleEngagement(i) {
    setData((d) => {
      const next = [...d.engagements];
      next[i] = !next[i];
      return { ...d, engagements: next };
    });
  }

  function reinitialiserFormulaire({ remonter = true } = {}) {
    setData(emptyData(engagementsAffiches.length));
    setStep(1);
    setMaxStepReached(1);
    setErrors({});
    setSubmitting(false);
    setSubmitError('');
    setSubmitStatus(null);
    setCreated(null);
    setNpiPhase('idle');
    setNpiSession(null);
    setOtpValue('');
    setNpiStatus(null);
    setGerantPhase('idle');
    setGerantSession(null);
    setGerantOtp('');
    setGerantStatus(null);
    setIfuStatus(null);
    setIfuVerifie('');
    setGpsStatus(null);
    setApiex({ phase: 'idle', npi: '', entreprises: [], message: '' });
    setCasier({ phase: 'idle' });
    setMontants(null);
    setPaiement(null);
    setPaiementStatus(null);
    setTransactionEnCours(null);
    try { localStorage.removeItem(DRAFT_KEY); } catch (err) { /* rien */ }
    if (remonter) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- RNPP / ANIP ----------------------------------------------------------

  const npiLocked = npiPhase === 'verified';

  function messageOtp(session) {
    const base = `Un code à 6 chiffres vient d'être envoyé au ${session.telephoneMasque}, numéro rattaché à ce NPI au RNPP.`;
    return session.otpDemo ? `${base} Code de démonstration : ${session.otpDemo}.` : base;
  }

  async function npiLookup() {
    const npi = data.npi.trim();
    if (!/^\d{10}$/.test(npi)) {
      setNpiStatus({ kind: 'error', text: 'Le NPI doit comporter exactement 10 chiffres.' });
      return;
    }
    setNpiPhase('loading');
    setNpiStatus({ kind: 'loading', text: 'Interrogation du RNPP (ANIP)…' });
    try {
      const session = await api.npiLookup(npi, await jetonRecaptcha(recaptchaSiteKey, 'npi_lookup'));
      setNpiSession(session);
      setOtpValue('');
      setNpiPhase('otp');
      setNpiStatus({ kind: 'info', hint: messageOtp(session), text: '' });
    } catch (err) {
      setNpiPhase('idle');
      setNpiStatus({ kind: 'error', text: err.message });
    }
  }

  async function npiResendOtp() {
    if (!npiSession) return;
    setNpiStatus({ kind: 'loading', text: 'Envoi d’un nouveau code…' });
    try {
      const session = await api.npiResend(npiSession.requestId);
      const suivante = { ...npiSession, ...session };
      setNpiSession(suivante);
      setOtpValue('');
      setNpiStatus({ kind: 'info', hint: messageOtp(suivante), text: '' });
    } catch (err) {
      if (err.status === 410) annulerVerificationNpi();
      setNpiStatus({ kind: 'error', text: err.message });
    }
  }

  async function npiVerifyOtp() {
    if (!npiSession) return;
    setNpiPhase('verifying');
    setNpiStatus({ kind: 'loading', text: 'Vérification du code…' });
    try {
      const { identite, photo, verificationToken } = await api.npiConfirm(npiSession.requestId, otpValue.trim());
      patch({
        nom: identite.nom,
        prenom: identite.prenom,
        naissance: identite.naissance,
        sexe: identite.sexe,
        nationalite: identite.nationalite || '',
        tel: identite.tel,
        adresse: identite.adresse,
        photoRnpp: photo || '',
        npiVerification: verificationToken
      });
      setNpiPhase('verified');
      setNpiSession(null);
      setOtpValue('');
      setNpiStatus({ kind: 'success', text: '✓ Identité confirmée et retrouvée au RNPP (ANIP).' });
    } catch (err) {
      if (err.status === 410 || err.status === 429) {
        annulerVerificationNpi();
        setNpiStatus({ kind: 'error', text: err.message });
        return;
      }
      setNpiPhase('otp');
      setNpiStatus({ kind: 'error', hint: npiSession ? messageOtp(npiSession) : '', text: err.message });
    }
  }

  function annulerVerificationNpi() {
    setNpiPhase('idle');
    setNpiSession(null);
    setOtpValue('');
    setNpiStatus(null);
    patch({ photoRnpp: '', npiVerification: '' });
  }

  /** Le NPI change : les entreprises retrouvées étaient celles de l'ancien. */
  function oublierEntreprises() {
    setApiex({ phase: 'idle', npi: '', entreprises: [], message: '' });
    if (data.entrepriseApiex) {
      patch({ entrepriseApiex: '', saisieManuelle: false, raisonSociale: '', rccm: '', ifu: '' });
      setIfuVerifie('');
      setIfuStatus(null);
    }
  }

  /** « Modifier le NPI » : le représentant change, l'identité est à refaire. */
  function npiEdit() {
    annulerVerificationNpi();
    oublierEntreprises();
    setCasier({ phase: 'idle' });
    setMontants(null);
    setPaiement(null);
    setPaiementStatus(null);
    setTransactionEnCours(null);
    patch({ nom: '', prenom: '', naissance: '', sexe: '', nationalite: '', tel: '', adresse: '' });
  }

  // --- Gérant ---------------------------------------------------------------

  const gerantLocked = gerantPhase === 'verified';

  function messageOtpGerant(session) {
    const base = `Un code à 6 chiffres vient d'être envoyé au ${session.telephoneMasque}, numéro du gérant au RNPP. Demandez-le au gérant pour confirmer son identité.`;
    return session.otpDemo ? `${base} Code de démonstration : ${session.otpDemo}.` : base;
  }

  /** « Le représentant légal est-il aussi le gérant ? » */
  function choisirGerant(valeur) {
    if (valeur === data.gerantEstRepresentant) return;
    if (valeur === 'oui') annulerVerificationGerant({ effacerNpi: true });
    patch({ gerantEstRepresentant: valeur });
    setErrors((e) => ({ ...e, gerantNpi: undefined, gerantEmail: undefined }));
  }

  async function gerantLookup() {
    const npi = data.gerantNpi.trim();
    if (!/^\d{10}$/.test(npi)) {
      setGerantStatus({ kind: 'error', text: 'Le NPI du gérant doit comporter exactement 10 chiffres.' });
      return;
    }
    if (npi === data.npi.trim()) {
      setGerantStatus({ kind: 'error', text: 'Ce NPI est celui du représentant légal : répondez « Oui » à la question précédente.' });
      return;
    }
    setGerantPhase('loading');
    setGerantStatus({ kind: 'loading', text: 'Interrogation du RNPP (ANIP)…' });
    try {
      const session = await api.npiLookup(npi, await jetonRecaptcha(recaptchaSiteKey, 'npi_lookup'));
      setGerantSession(session);
      setGerantOtp('');
      setGerantPhase('otp');
      setGerantStatus({ kind: 'info', hint: messageOtpGerant(session), text: '' });
    } catch (err) {
      setGerantPhase('idle');
      setGerantStatus({ kind: 'error', text: err.message });
    }
  }

  async function gerantResendOtp() {
    if (!gerantSession) return;
    setGerantStatus({ kind: 'loading', text: 'Envoi d’un nouveau code…' });
    try {
      const session = await api.npiResend(gerantSession.requestId);
      const suivante = { ...gerantSession, ...session };
      setGerantSession(suivante);
      setGerantOtp('');
      setGerantStatus({ kind: 'info', hint: messageOtpGerant(suivante), text: '' });
    } catch (err) {
      if (err.status === 410) annulerVerificationGerant();
      setGerantStatus({ kind: 'error', text: err.message });
    }
  }

  async function gerantVerifyOtp() {
    if (!gerantSession) return;
    setGerantPhase('verifying');
    setGerantStatus({ kind: 'loading', text: 'Vérification du code…' });
    try {
      const { identite, photo, verificationToken } = await api.npiConfirm(gerantSession.requestId, gerantOtp.trim());
      patch({
        gerantNom: identite.nom,
        gerantPrenom: identite.prenom,
        gerantNaissance: identite.naissance,
        gerantSexe: identite.sexe,
        gerantNationalite: identite.nationalite || '',
        gerantTel: identite.tel,
        gerantAdresse: identite.adresse,
        gerantPhoto: photo || '',
        gerantNpiVerification: verificationToken
      });
      setGerantPhase('verified');
      setGerantSession(null);
      setGerantOtp('');
      setGerantStatus({ kind: 'success', text: '✓ Identité du gérant confirmée et retrouvée au RNPP (ANIP).' });
    } catch (err) {
      if (err.status === 410 || err.status === 429) {
        annulerVerificationGerant();
        setGerantStatus({ kind: 'error', text: err.message });
        return;
      }
      setGerantPhase('otp');
      setGerantStatus({ kind: 'error', hint: gerantSession ? messageOtpGerant(gerantSession) : '', text: err.message });
    }
  }

  /** Repart de zéro pour le gérant ; `effacerNpi` vide aussi le NPI saisi. */
  function annulerVerificationGerant({ effacerNpi = false } = {}) {
    setGerantPhase('idle');
    setGerantSession(null);
    setGerantOtp('');
    setGerantStatus(null);
    // eslint-disable-next-line no-unused-vars
    const { gerantNpi, gerantEmail, ...identite } = GERANT_VIDE;
    patch(effacerNpi ? GERANT_VIDE : identite);
  }

  // --- APIEX : entreprises rattachées au NPI ---------------------------------

  /** Reprend dans le formulaire les informations d'une entreprise APIEX. */
  function appliquerEntreprise(entreprise, nomCommercialActuel = data.nomCommercial) {
    patch({
      entrepriseApiex: entreprise.id,
      saisieManuelle: false,
      raisonSociale: entreprise.raisonSociale,
      rccm: entreprise.rccm,
      ifu: entreprise.ifu || '',
      nomCommercial: nomCommercialActuel || entreprise.nomCommercial || ''
    });
    // Un IFU fourni par l'APIEX n'a pas à être revérifié à la DGI.
    setIfuVerifie(entreprise.ifu || '');
    setIfuStatus(null);
  }

  /** « Mon entreprise n'est pas dans la liste » : saisie libre. */
  function passerEnSaisie() {
    patch({ entrepriseApiex: '', saisieManuelle: true, raisonSociale: '', rccm: '', ifu: '' });
    setIfuVerifie('');
    setIfuStatus(null);
  }

  function choisirEntreprise(id) {
    if (id === '__saisie') { passerEnSaisie(); return; }
    if (!id) { patch({ entrepriseApiex: '', saisieManuelle: false, raisonSociale: '', rccm: '', ifu: '' }); return; }
    const entreprise = apiex.entreprises.find((e) => e.id === id);
    if (entreprise) appliquerEntreprise(entreprise);
  }

  /**
   * Interroge l'APIEX (via l'API) sur le NPI vérifié. Une seule entreprise :
   * elle est reprise d'office. Plusieurs : le demandeur choisit. Aucune, ou
   * service indisponible : il saisit son entreprise.
   */
  async function chargerEntreprises(force = false) {
    const npi = data.npi.trim();
    if (!data.npiVerification) {
      setApiex({ phase: 'sans-npi', npi, entreprises: [], message: '' });
      return;
    }
    if (!force && apiex.phase === 'done' && apiex.npi === npi) return;

    setApiex({ phase: 'loading', npi, entreprises: [], message: '' });
    try {
      const { entreprises } = await api.apiexEntreprises(npi, data.npiVerification);
      setApiex({ phase: 'done', npi, entreprises, message: '' });

      const dejaChoisie = entreprises.find((e) => e.id === data.entrepriseApiex);
      if (dejaChoisie) appliquerEntreprise(dejaChoisie);
      else if (entreprises.length === 1 && !data.saisieManuelle) appliquerEntreprise(entreprises[0]);
      else if (entreprises.length === 0) patch({ entrepriseApiex: '', saisieManuelle: true });
      else if (data.entrepriseApiex) patch({ entrepriseApiex: '', raisonSociale: '', rccm: '', ifu: '' });
    } catch (err) {
      setApiex({
        phase: err.status === 403 ? 'sans-npi' : 'echec',
        npi,
        entreprises: [],
        message: err.message
      });
    }
  }

  // Brouillon repris directement à l'étape 2 : la recherche part d'elle-même.
  useEffect(() => {
    if (step === 2 && apiex.phase === 'idle') chargerEntreprises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /** Preuve du NPI expirée : retour à l'étape 1 pour la reprendre. */
  function reprendreVerificationNpi() {
    annulerVerificationNpi();
    setApiex({ phase: 'idle', npi: '', entreprises: [], message: '' });
    setCasier({ phase: 'idle' });
    setStep(1);
  }

  // --- IFU / DGI ------------------------------------------------------------

  async function ifuVerify() {
    const ifu = data.ifu.trim();
    if (!/^\d{12,13}$/.test(ifu)) {
      setIfuStatus({ kind: 'error', text: "L'IFU doit comporter 12 ou 13 chiffres." });
      return;
    }
    setIfuLoading(true);
    setIfuStatus({ kind: 'loading', text: 'Vérification auprès de la DGI…' });
    try {
      const resultat = await api.ifuVerify(ifu);
      setIfuVerifie(ifu);
      setIfuStatus(resultat.actif
        ? { kind: 'success', text: resultat.message }
        : { kind: 'warning', text: resultat.message });
    } catch (err) {
      if (err.status === 404) {
        setIfuVerifie(ifu);
        setIfuStatus({ kind: 'warning', text: err.message });
      } else {
        setIfuStatus({ kind: 'error', text: err.message });
      }
    } finally {
      setIfuLoading(false);
    }
  }

  const ifuAVerifier = data.ifu.trim() !== '' && data.ifu.trim() !== ifuVerifie;

  // --- Géolocalisation ------------------------------------------------------

  function localiser() {
    if (!navigator.geolocation) {
      setGpsStatus({ kind: 'error', text: "Votre navigateur ne permet pas la géolocalisation : saisissez les coordonnées." });
      return;
    }
    setGpsStatus({ kind: 'loading', text: 'Recherche de votre position…' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        patch({ gpsLatitude: pos.coords.latitude.toFixed(6), gpsLongitude: pos.coords.longitude.toFixed(6) });
        setGpsStatus({ kind: 'success', text: "✓ Position relevée. Vérifiez qu'il s'agit bien de l'emplacement de l'agence." });
      },
      () => setGpsStatus({ kind: 'error', text: "Position indisponible : autorisez la localisation ou saisissez les coordonnées." }),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  // --- Casier judiciaire et frais ---------------------------------------------

  /**
   * Le CNCJ détient-il un casier valide pour le représentant ? La réponse
   * décide des frais : dossier seul, ou dossier + établissement du casier.
   * L'API rend aussi un paiement déjà réglé (reprise du formulaire).
   */
  async function chargerCasier(force = false) {
    if (!data.npiVerification) {
      setCasier({ phase: 'sans-npi' });
      return;
    }
    if (!force && casier.phase === 'loading') return;

    setCasier({ phase: 'loading' });
    try {
      const resultat = await api.casierVerify(data.npi.trim(), data.npiVerification, force);
      setCasier({ phase: 'done', ...resultat.casier });
      setMontants(resultat.montants);
      if (resultat.paiement) setPaiement(resultat.paiement);
    } catch (err) {
      setCasier({ phase: err.status === 403 ? 'sans-npi' : 'echec', message: err.message });
    }
  }

  // Brouillon repris aux étapes 4 ou 5 : la consultation part d'elle-même.
  useEffect(() => {
    if ((step === 4 || step === 5) && casier.phase === 'idle') chargerCasier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Redemande le verdict à l'API — c'est elle qui reconsulte FedaPay et
   * recompare le montant. Un débit Mobile Money met parfois quelques
   * secondes à être confirmé : on réessaie tant que l'opérateur n'a pas conclu.
   */
  /**
   * Redemande le verdict à l'API, `essais` fois au plus tant que l'opérateur
   * n'a pas conclu. Rend `{ statut, resultat }` : `confirme`, `en_attente`,
   * `echoue` ou `inconnu`. Une transaction perdue est oubliée — un nouveau
   * clic en rouvrira une.
   */
  async function verdictPaiement(transactionId, essais = 10) {
    for (let reste = essais; ; reste--) {
      const resultat = await api.paiementVerifier(data.npi.trim(), data.npiVerification, transactionId);

      if (resultat.paiementStatut === 'confirme') {
        setTransactionEnCours(null);
        setPaiement(resultat.paiement);
        if (resultat.casier) setCasier((c) => ({ ...c, ...resultat.casier, phase: 'done' }));
        setPaiementStatus(resultat.message
          ? { kind: 'warning', text: resultat.message }
          : { kind: 'success', text: `✓ Paiement de ${formatMontant(resultat.paiement?.montant)} confirmé (réf. ${resultat.paiement?.reference}).` });
        return 'confirme';
      }

      if (resultat.paiementStatut !== 'en_attente') {
        setTransactionEnCours(null);
        setPaiementStatus({ kind: 'error', text: resultat.message || "Le paiement n'a pas abouti. Vous pouvez réessayer." });
        return resultat.paiementStatut;
      }

      if (reste <= 0) {
        // Toujours pas encaissé : la transaction reste ouverte côté API, le
        // formulaire la garde pour la reprendre.
        setTransactionEnCours(transactionId);
        setPaiementStatus({
          kind: 'warning',
          text: "Votre opérateur n'a pas encore confirmé le paiement. Reprenez dans quelques instants : rien ne vous sera débité une seconde fois."
        });
        return 'en_attente';
      }

      setPaiementStatus({ kind: 'loading', text: 'Vérification du statut de votre paiement…' });
      await pause(3000);
    }
  }

  /**
   * Règlement des frais chez FedaPay, puis dépôt du dossier. Le navigateur
   * n'est maître de rien : l'API crée la transaction pour le montant qu'elle
   * calcule, la fenêtre FedaPay encaisse (Mobile Money ou carte), puis l'API
   * redemande le statut à FedaPay — c'est son verdict qui compte.
   */
  async function payerPuisSoumettre() {
    // Ce paiement est conduit d'ici : la reprise automatique n'a plus lieu d'être.
    paiementRepris.current = true;
    setSubmitting(true);
    setSubmitError('');

    try {
      // Transaction laissée ouverte : le verdict d'abord. Elle a pu être
      // payée sans que le formulaire l'apprenne.
      if (transactionEnCours) {
        setPaiementStatus({ kind: 'loading', text: 'Vérification de votre paiement…' });
        const issue = await verdictPaiement(transactionEnCours, 0);
        if (issue === 'confirme') {
          await submit();
          return;
        }
      }

      setPaiementStatus({ kind: 'loading', text: 'Ouverture du paiement sécurisé…' });
      const checkout = await api.paiementOuvrir({
        npi: data.npi.trim(),
        verificationToken: data.npiVerification,
        email: data.email.trim(),
        telephone: data.tel || null
      });

      // Frais déjà réglés (webhook arrivé avant le navigateur, double clic) :
      // rien à repayer.
      if (checkout.dejaRegle) {
        setTransactionEnCours(null);
        setPaiement(checkout.paiement);
        setPaiementStatus({ kind: 'success', text: `✓ Paiement de ${formatMontant(checkout.paiement?.montant)} déjà enregistré.` });
        await submit();
        return;
      }

      setTransactionEnCours(checkout.transactionId);

      // Mode de démonstration de l'API (FEDAPAY_FAKE) : aucune fenêtre à
      // ouvrir, la transaction est réputée réglée.
      if (!checkout.simule) {
        const issue = await ouvrirPaiement(checkout);
        if (issue.ferme) {
          setPaiementStatus({ kind: 'info', text: 'Paiement interrompu. Vous pouvez le reprendre quand vous le souhaitez.' });
          setSubmitting(false);
          return;
        }
      }

      setPaiementStatus({ kind: 'loading', text: checkout.simule ? 'Paiement simulé — vérification…' : 'Vérification du paiement auprès de FedaPay…' });
      if (await verdictPaiement(checkout.transactionId) !== 'confirme') {
        setSubmitting(false);
        return;
      }
    } catch (err) {
      setPaiementStatus({ kind: 'error', text: err.message });
      setSubmitting(false);
      return;
    }

    await submit();
  }

  /**
   * Paiement ouvert lors d'une visite précédente et jamais conclu : onglet
   * fermé pendant la confirmation de l'opérateur, ou retour d'un 3-D Secure
   * bancaire (FedaPay renvoie alors le navigateur sur `?id=…&status=…`).
   *
   * Le `status` de l'URL n'est pas cru — il suffirait de le taper : seul
   * l'identifiant en est repris, et le verdict se redemande à l'API. Les
   * pièces jointes ne survivent pas à un rechargement : le formulaire
   * ramène à l'étape 4 pour les rejoindre, le paiement reste acquis.
   */
  useEffect(() => {
    if (paiementRepris.current || paiement || !data.npiVerification || step < 4) return;

    const params = new URLSearchParams(window.location.search);
    const transactionId = params.get('id') || transactionEnCours;
    if (!transactionId) return;

    paiementRepris.current = true;
    if (params.get('id')) {
      // L'adresse de retour de FedaPay ne doit pas être rejouée au prochain rechargement.
      window.history.replaceState(null, '', window.location.pathname);
    }

    setPaiementStatus({ kind: 'loading', text: 'Reprise de votre paiement en cours…' });
    verdictPaiement(String(transactionId))
      .then((issue) => {
        if (issue === 'confirme' && pieces.some((cle) => !(data.uploads[cle] || []).length)) {
          setStep(4);
          setPaiementStatus({
            kind: 'success',
            text: '✓ Paiement confirmé. Joignez à nouveau vos pièces (elles ne sont pas conservées au rechargement de la page), puis soumettez votre demande.'
          });
        }
      })
      .catch((err) => setPaiementStatus({ kind: 'error', text: err.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, transactionEnCours, data.npiVerification]);

  // --- navigation -----------------------------------------------------------

  const ctx = { nbEngagements: engagementsAffiches.length, apiex, casier };
  const requisManquants = [
    ...champsRequisManquants(step, data, ctx),
    ...(step === 2 && ifuAVerifier ? ['ifu'] : [])
  ];
  const manque = (champ) => requisManquants.includes(champ);

  function goPrev() {
    setStep((s) => Math.max(1, s - 1));
    setErrors({});
  }

  function goToStep(n) {
    if (n <= maxStepReached) {
      setStep(n);
      setErrors({});
    }
  }

  function goNext(event) {
    event.preventDefault();
    if (requisManquants.length) return;

    const err = validateStep(step, data);
    if (Object.keys(err).length) {
      setErrors(err);
      return;
    }

    if (step === STEP_COUNT) {
      // Une étape antérieure a pu rester incomplète (brouillon repris).
      for (let i = 1; i < STEP_COUNT; i++) {
        const e = validateStep(i, data);
        if (champsRequisManquants(i, data, ctx).length || Object.keys(e).length) {
          setStep(i);
          setMaxStepReached((m) => Math.max(m, i));
          setErrors(e);
          return;
        }
      }
      if (paiement) submit();
      else payerPuisSoumettre();
      return;
    }

    // En quittant l'identification, l'APIEX est interrogée : les entreprises
    // sont déjà là à l'arrivée sur l'étape 2.
    if (step === 1) chargerEntreprises();
    if (step === 3) chargerCasier();

    setStep((s) => s + 1);
    setMaxStepReached((m) => Math.max(m, step + 1));
    setErrors({});
    window.scrollTo({ top: document.getElementById('form-start')?.offsetTop || 0, behavior: 'smooth' });
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError('');
    setSubmitStatus({ kind: 'loading', text: 'Envoi du dossier…' });

    const physique = data.typeStructure === 'physique';

    try {
      const recaptchaToken = await jetonRecaptcha(recaptchaSiteKey, 'depot_demande');
      const recu = await api.deposerDemande({
        recaptchaToken,
        // Représentant légal
        npi: data.npi,
        nom: data.nom,
        prenom: data.prenom,
        naissance: data.naissance,
        sexe: data.sexe,
        nationalite: data.nationalite,
        tel: data.tel,
        email: data.email.trim(),
        adresse: data.adresse,
        npiVerification: data.npiVerification || null,
        // Gérant : son état civil est relu par l'API dans sa copie RNPP.
        gerantEstRepresentant: data.gerantEstRepresentant === 'oui',
        ...(data.gerantEstRepresentant === 'non' ? {
          gerantNpi: data.gerantNpi.trim(),
          gerantNpiVerification: data.gerantNpiVerification || null,
          gerantEmail: data.gerantEmail.trim()
        } : {}),
        // Agence
        // Identifiant seulement : l'API reprend raison sociale, RCCM et IFU
        // de sa propre copie de la réponse APIEX.
        entrepriseApiex: data.entrepriseApiex || '',
        raisonSociale: data.raisonSociale.trim(),
        rccm: data.rccm.trim(),
        ifu: data.ifu.trim(),
        nomCommercial: data.nomCommercial.trim(),
        telAgence: data.telAgence.trim(),
        anneeDemarrage: Number(data.anneeDemarrage),
        categorie: data.categorie,
        regime: data.regime,
        regimeAutre: data.regime === 'autre' ? data.regimeAutre.trim() : '',
        // Implantation
        typeStructure: data.typeStructure,
        departement: physique ? data.departement : '',
        commune: physique ? data.commune : '',
        arrondissement: physique ? data.arrondissement.trim() : '',
        quartier: physique ? data.quartier.trim() : '',
        carreMaison: physique ? data.carreMaison.trim() : '',
        lotReference: physique ? data.lotReference.trim() : '',
        gpsLatitude: physique ? nombre(data.gpsLatitude) : null,
        gpsLongitude: physique ? nombre(data.gpsLongitude) : null,
        indicationGeo: physique ? data.indicationGeo.trim() : '',
        siteWeb: data.siteWeb.trim(),
        adressePostale: data.adressePostale.trim(),
        // Situation et engagement
        engagements: data.engagements
      });

      // Les pièces, une à une, par l'URL signée remise par l'API.
      const aTeleverser = pieces.flatMap((cle) => (data.uploads[cle] || []).map((file) => [cle, file]));
      const echecs = [];
      for (let i = 0; i < aTeleverser.length; i++) {
        const [cle, file] = aTeleverser[i];
        setSubmitStatus({ kind: 'loading', text: `Envoi des pièces jointes (${i + 1}/${aTeleverser.length})…` });
        try {
          await api.televerserPiece(recu.uploadUrl, cle, file);
        } catch (err) {
          echecs.push(`${PIECES[cle]?.titre || cle} (${file.name})`);
        }
      }

      // Accusé de réception : son échec ne remet pas le dossier en cause.
      try {
        await api.finaliser(recu.finalisationUrl);
      } catch (err) {
        // le dossier est enregistré, le numéro de suivi est affiché
      }

      try { localStorage.removeItem(DRAFT_KEY); } catch (err) { /* rien */ }
      setCreated({ ...recu, piecesEnEchec: echecs });
      window.scrollTo({ top: document.getElementById('form-start')?.offsetTop || 0, behavior: 'smooth' });
    } catch (err) {
      if (err.errors?.paiement) setPaiement(null);
      // Vérification du gérant expirée : elle est à refaire à l'étape 1.
      if (err.errors?.gerantNpi) {
        annulerVerificationGerant();
        setStep(1);
      }
      setSubmitError(err.message || "Échec de l'envoi du dossier. Réessayez dans quelques instants.");
    } finally {
      setSubmitting(false);
      setSubmitStatus(null);
    }
  }

  const done = !!created;
  const progress = Math.round(((done ? STEP_COUNT : step - 1) / STEP_COUNT) * 100);

  // --- rendu ----------------------------------------------------------------

  return (
    <main className="page-main form-layout" id="contenu">

      <aside className="form-aside">
        <div className="form-aside__intro">
          <span className="eyebrow">Agences de voyage et de tourisme</span>
          <h2>Demande de licence d'agence de voyage et de tourisme</h2>
          <p>
            Renseignez les informations de votre agence et joignez les pièces demandées. Votre
            identité de représentant légal est vérifiée auprès du RNPP.
          </p>
        </div>

        <div className="progress-track">
          <div className="progress-track__fill" style={{ width: progress + '%' }} />
        </div>

        <nav className="step-list" aria-label="Étapes du formulaire">
          {STEP_INFO.map((label, i) => {
            const n = i + 1;
            const locked = n > maxStepReached;
            const cls = 'step-list__item' +
              (!done && n === step ? ' is-active' : '') +
              (done || n < step ? ' is-done' : '') +
              (locked ? ' is-locked' : '');
            return (
              <button
                type="button"
                className={cls}
                key={n}
                aria-current={!done && n === step ? 'step' : undefined}
                aria-disabled={locked || undefined}
                onClick={() => goToStep(n)}
              >
                <span className="step-list__dot" aria-hidden="true">{done || n < step ? '✓' : n}</span>
                <span>Étape {n} — {label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="form-panel" id="form-start">
        <div className="form-panel__header">
          <span className="form-panel__step-num">{Math.min(step, STEP_COUNT)}/{STEP_COUNT}</span>
          <h2 className="form-panel__title">{done ? 'Dossier transmis' : STEP_INFO[step - 1]}</h2>
        </div>

        <form onSubmit={goNext} noValidate>
          <div className="form-panel__body">

            {!done && Object.keys(errors).length > 0 && (
              <div className="form-banner" role="alert">
                Certains champs comportent une erreur de format. Corrigez-les avant de continuer.
              </div>
            )}
            {!done && submitError && <div className="form-banner" role="alert">{submitError}</div>}

            {/* Étape 1 — Représentant légal et gérant */}
            {!done && step === 1 && (
              <div className="form-step">
                <p className="step-intro">
                  Le représentant légal (ou promoteur) est la personne physique qui représente
                  l'agence. Son identité est récupérée au Registre National des Personnes Physiques
                  à partir de son NPI, après confirmation par un code reçu par SMS. Indiquez ensuite
                  qui est le gérant de l'agence ; s'il s'agit d'une autre personne, son identité est
                  vérifiée de la même façon.
                </p>
                <div className="npi-lookup">
                  <div className="npi-lookup__header">
                    <span className="npi-lookup__title">Identification via le RNPP (ANIP)</span>
                  </div>
                  {npiPhase !== 'otp' && npiPhase !== 'verifying' && (
                    <div className="npi-lookup__row">
                      <input
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="NPI du représentant légal — ex. 0123456789"
                        autoComplete="off"
                        aria-label="NPI du représentant légal"
                        value={data.npi}
                        disabled={npiLocked || npiPhase === 'loading'}
                        onChange={(e) => patch({ npi: e.target.value })}
                      />
                      <button type="button" className="btn btn-primary" disabled={npiLocked || npiPhase === 'loading'} onClick={npiLookup}>
                        Vérifier le NPI
                      </button>
                    </div>
                  )}
                  {(npiPhase === 'otp' || npiPhase === 'verifying') && (
                    <div className="npi-lookup__otp">
                      <p className="npi-lookup__otp-npi">NPI : {data.npi}</p>
                      <p className="npi-lookup__hint">{npiStatus?.hint}</p>
                      <div className="npi-lookup__row">
                        <input
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="Code de vérification"
                          autoComplete="one-time-code"
                          aria-label="Code de vérification"
                          value={otpValue}
                          disabled={npiPhase === 'verifying'}
                          onChange={(e) => setOtpValue(e.target.value)}
                        />
                        <button type="button" className="btn btn-primary" disabled={npiPhase === 'verifying'} onClick={npiVerifyOtp}>
                          Valider le code
                        </button>
                      </div>
                      <div className="npi-lookup__otp-actions">
                        <button type="button" className="npi-lookup__link" onClick={npiResendOtp}>Renvoyer le code</button>
                        <button type="button" className="npi-lookup__link" onClick={npiEdit}>Modifier le NPI</button>
                      </div>
                    </div>
                  )}
                  {npiStatus && npiStatus.kind && <Status status={npiStatus} />}
                  {npiLocked && (
                    <div className="npi-lookup__otp-actions">
                      <button type="button" className="npi-lookup__link" onClick={npiEdit}>Modifier le NPI</button>
                    </div>
                  )}
                  {manque('npi') && npiPhase === 'idle' && !npiStatus && (
                    <span className="field-hint">Vérifiez le NPI du représentant légal pour continuer.</span>
                  )}
                </div>

                <fieldset className={'rnpp-card' + (npiLocked ? ' rnpp-card--verified' : '')}>
                  <legend className="rnpp-card__legend">
                    Informations sur le représentant légal
                    {npiLocked && <span className="rnpp-card__badge">Vérifié</span>}
                  </legend>
                  <div className="form-grid">
                    <Field label="Nom"><span className="form-field__readonly">{data.nom}</span></Field>
                    <Field label="Prénom(s)"><span className="form-field__readonly">{data.prenom}</span></Field>
                    <Field label="Date de naissance"><input type="date" value={data.naissance} disabled /></Field>
                    <Field label="Sexe"><input value={data.sexe} disabled /></Field>
                    <div className="rnpp-final span-2">
                      <Field label="Nationalité"><input value={data.nationalite} disabled /></Field>
                      <Field label="Téléphone"><input type="tel" value={data.tel} disabled /></Field>
                      <Field label="Adresse de résidence" className="rnpp-final__adresse">
                        <span className="form-field__readonly">{data.adresse}</span>
                      </Field>
                      <figure className="rnpp-final__photo">
                        {npiLocked && data.photoRnpp ? (
                          <img src={data.photoRnpp} alt={`Photo d'identité transmise par le RNPP pour ${data.prenom} ${data.nom}`} />
                        ) : (
                          <figcaption className="rnpp-final__photo-vide">Photo d’identité</figcaption>
                        )}
                      </figure>
                    </div>
                  </div>
                </fieldset>

                <div className="form-grid">
                  <Field label="Adresse email du représentant légal" required error={errors.email}>
                    <input
                      type="email"
                      required
                      aria-invalid={errors.email || manque('email') ? 'true' : undefined}
                      placeholder="nom@exemple.bj"
                      value={data.email}
                      onChange={(e) => patch({ email: e.target.value })}
                    />
                  </Field>
                </div>
                <span className="field-hint">
                  Les notifications relatives au dossier (accusé de réception, demandes de
                  complément, décision) sont envoyées à cette adresse.
                </span>

                {/* Gérant : pas forcément le représentant légal. Deux boutons
                    plutôt qu'une question à cocher : le cas courant — le
                    représentant gère lui-même l'agence — se règle d'un clic. */}
                <div className={'field-group gerant-choix' + (manque('gerant') ? ' gerant-choix--manquant' : '')}>
                  <span className="field-group__label" id="gerant-question">
                    Gérant de l'agence{' '}
                    <span className="form-field__required" aria-hidden="true">*</span>
                  </span>
                  <div className="gerant-rapide" role="group" aria-labelledby="gerant-question">
                    <button
                      type="button"
                      className={'gerant-rapide__btn' + (data.gerantEstRepresentant === 'oui' ? ' is-active' : '')}
                      aria-pressed={data.gerantEstRepresentant === 'oui'}
                      onClick={() => choisirGerant('oui')}
                    >
                      <span className="gerant-rapide__coche" aria-hidden="true">✓</span>
                      <span className="gerant-rapide__texte">
                        <strong>Le gérant est le représentant légal</strong>
                        <small>
                          {data.nom ? `${data.prenom} ${data.nom} gère lui-même l'agence` : "Le représentant gère lui-même l'agence"}
                        </small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={'gerant-rapide__btn' + (data.gerantEstRepresentant === 'non' ? ' is-active' : '')}
                      aria-pressed={data.gerantEstRepresentant === 'non'}
                      onClick={() => choisirGerant('non')}
                    >
                      <span className="gerant-rapide__coche" aria-hidden="true">✓</span>
                      <span className="gerant-rapide__texte">
                        <strong>Le gérant est une autre personne</strong>
                        <small>Son identité sera vérifiée au RNPP par code SMS</small>
                      </span>
                    </button>
                  </div>
                  {manque('gerant') && (
                    <span className="field-hint field-hint--error">Indiquez qui gère l'agence pour continuer.</span>
                  )}
                  <span className="field-hint">
                    Le gérant dirige l'activité de l'agence au quotidien. Sa pièce d'identité, son
                    curriculum vitae, ses attestations d'expérience et son casier judiciaire sont
                    demandés au dossier.
                  </span>
                </div>

                {data.gerantEstRepresentant === 'non' && (
                  <>
                    <div className="npi-lookup">
                      <div className="npi-lookup__header">
                        <span className="npi-lookup__title">Identification du gérant via le RNPP (ANIP)</span>
                      </div>
                      <p className="npi-lookup__hint">
                        Un code de confirmation est envoyé par SMS au numéro du gérant inscrit au RNPP :
                        le gérant doit être joignable pour vous le communiquer.
                      </p>
                      {gerantPhase !== 'otp' && gerantPhase !== 'verifying' && (
                        <div className="npi-lookup__row">
                          <input
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="NPI du gérant — ex. 0123456789"
                            autoComplete="off"
                            aria-label="NPI du gérant"
                            aria-invalid={errors.gerantNpi ? 'true' : undefined}
                            value={data.gerantNpi}
                            disabled={gerantLocked || gerantPhase === 'loading'}
                            onChange={(e) => patch({ gerantNpi: e.target.value })}
                          />
                          <button type="button" className="btn btn-primary" disabled={gerantLocked || gerantPhase === 'loading'} onClick={gerantLookup}>
                            Vérifier le NPI
                          </button>
                        </div>
                      )}
                      {(gerantPhase === 'otp' || gerantPhase === 'verifying') && (
                        <div className="npi-lookup__otp">
                          <p className="npi-lookup__otp-npi">NPI du gérant : {data.gerantNpi}</p>
                          <p className="npi-lookup__hint">{gerantStatus?.hint}</p>
                          <div className="npi-lookup__row">
                            <input
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="Code de vérification"
                              autoComplete="one-time-code"
                              aria-label="Code de vérification du gérant"
                              value={gerantOtp}
                              disabled={gerantPhase === 'verifying'}
                              onChange={(e) => setGerantOtp(e.target.value)}
                            />
                            <button type="button" className="btn btn-primary" disabled={gerantPhase === 'verifying'} onClick={gerantVerifyOtp}>
                              Valider le code
                            </button>
                          </div>
                          <div className="npi-lookup__otp-actions">
                            <button type="button" className="npi-lookup__link" onClick={gerantResendOtp}>Renvoyer le code</button>
                            <button type="button" className="npi-lookup__link" onClick={() => annulerVerificationGerant()}>Modifier le NPI</button>
                          </div>
                        </div>
                      )}
                      {gerantStatus && gerantStatus.kind && <Status status={gerantStatus} />}
                      {errors.gerantNpi && <Status status={{ kind: 'error', text: errors.gerantNpi }} />}
                      {gerantLocked && (
                        <div className="npi-lookup__otp-actions">
                          <button type="button" className="npi-lookup__link" onClick={() => annulerVerificationGerant()}>Modifier le NPI</button>
                        </div>
                      )}
                      {manque('gerantNpi') && gerantPhase === 'idle' && !gerantStatus && (
                        <span className="field-hint">Vérifiez le NPI du gérant pour continuer.</span>
                      )}
                    </div>

                    <fieldset className={'rnpp-card' + (gerantLocked ? ' rnpp-card--verified' : '')}>
                      <legend className="rnpp-card__legend">
                        Informations sur le gérant
                        {gerantLocked && <span className="rnpp-card__badge">Vérifié</span>}
                      </legend>
                      <div className="form-grid">
                        <Field label="Nom"><span className="form-field__readonly">{data.gerantNom}</span></Field>
                        <Field label="Prénom(s)"><span className="form-field__readonly">{data.gerantPrenom}</span></Field>
                        <Field label="Date de naissance"><input type="date" value={data.gerantNaissance} disabled /></Field>
                        <Field label="Sexe"><input value={data.gerantSexe} disabled /></Field>
                        <div className="rnpp-final span-2">
                          <Field label="Nationalité"><input value={data.gerantNationalite} disabled /></Field>
                          <Field label="Téléphone"><input type="tel" value={data.gerantTel} disabled /></Field>
                          <Field label="Adresse de résidence" className="rnpp-final__adresse">
                            <span className="form-field__readonly">{data.gerantAdresse}</span>
                          </Field>
                          <figure className="rnpp-final__photo">
                            {gerantLocked && data.gerantPhoto ? (
                              <img src={data.gerantPhoto} alt={`Photo d'identité transmise par le RNPP pour ${data.gerantPrenom} ${data.gerantNom}`} />
                            ) : (
                              <figcaption className="rnpp-final__photo-vide">Photo d’identité</figcaption>
                            )}
                          </figure>
                        </div>
                      </div>
                    </fieldset>

                    <div className="form-grid">
                      <Field label="Adresse email du gérant" error={errors.gerantEmail}>
                        <input
                          type="email"
                          aria-invalid={errors.gerantEmail ? 'true' : undefined}
                          placeholder="nom@exemple.bj"
                          value={data.gerantEmail}
                          onChange={(e) => patch({ gerantEmail: e.target.value })}
                        />
                      </Field>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Étape 2 — Information sur la demande et sur l'agence */}
            {!done && step === 2 && (
              <div className="form-step">
                <div className="npi-lookup">
                  <div className="npi-lookup__header">
                    <span className="npi-lookup__title">Entreprises rattachées à votre NPI (APIEX)</span>
                  </div>

                  {apiex.phase === 'loading' && (
                    <Status status={{ kind: 'loading', text: 'Recherche de vos entreprises auprès de l’APIEX…' }} />
                  )}

                  {apiex.phase === 'sans-npi' && (
                    <>
                      <p className="npi-lookup__hint">
                        {apiex.message || 'Votre NPI doit être vérifié pour retrouver vos entreprises.'}
                      </p>
                      <div className="npi-lookup__row">
                        <button type="button" className="btn btn-ghost" onClick={reprendreVerificationNpi}>
                          Reprendre la vérification de mon NPI
                        </button>
                      </div>
                    </>
                  )}

                  {apiex.phase === 'echec' && (
                    <>
                      <Status status={{ kind: 'error', text: apiex.message }} />
                      <div className="npi-lookup__otp-actions">
                        <button type="button" className="npi-lookup__link" onClick={() => chargerEntreprises(true)}>
                          Réessayer
                        </button>
                      </div>
                    </>
                  )}

                  {apiex.phase === 'done' && apiex.entreprises.length === 0 && (
                    <Status status={{ kind: 'info', text: "Aucune entreprise n'est rattachée à votre NPI à l'APIEX. Saisissez les informations de votre entreprise ci-dessous." }} />
                  )}

                  {apiex.phase === 'done' && apiex.entreprises.length === 1 && (
                    data.entrepriseApiex ? (
                      <>
                        <Status status={{ kind: 'success', text: `✓ Entreprise retrouvée à l'APIEX : ${apiex.entreprises[0].raisonSociale}. Ses informations ont été reprises.` }} />
                        <div className="npi-lookup__otp-actions">
                          <button type="button" className="npi-lookup__link" onClick={passerEnSaisie}>
                            Ce n'est pas l'entreprise concernée ? Saisir une autre entreprise
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="npi-lookup__otp-actions">
                        <button type="button" className="npi-lookup__link" onClick={() => appliquerEntreprise(apiex.entreprises[0])}>
                          Utiliser l'entreprise retrouvée : {apiex.entreprises[0].raisonSociale}
                        </button>
                      </div>
                    )
                  )}

                  {apiex.phase === 'done' && apiex.entreprises.length > 1 && (
                    <Field label="Entreprise pour laquelle la demande est faite" required>
                      <select
                        value={data.saisieManuelle ? '__saisie' : data.entrepriseApiex}
                        aria-invalid={manque('entreprise') ? 'true' : undefined}
                        onChange={(e) => choisirEntreprise(e.target.value)}
                      >
                        <option value="">— Choisissez parmi vos {apiex.entreprises.length} entreprises —</option>
                        {apiex.entreprises.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.raisonSociale} — {e.rccm}{e.qualite ? ` (${e.qualite})` : ''}
                          </option>
                        ))}
                        <option value="__saisie">Mon entreprise n'est pas dans la liste (saisie manuelle)</option>
                      </select>
                    </Field>
                  )}
                </div>

                {(() => {
                  const choisie = apiex.entreprises.find((e) => e.id === data.entrepriseApiex);
                  return choisie && (choisie.formeJuridique || choisie.dateImmatriculation || choisie.adresse) ? (
                    <dl className="recap__list entreprise-apiex">
                      {choisie.formeJuridique && <div><dt>Forme juridique</dt><dd>{choisie.formeJuridique}</dd></div>}
                      {choisie.dateImmatriculation && <div><dt>Immatriculée le</dt><dd>{new Date(choisie.dateImmatriculation).toLocaleDateString('fr-FR')}</dd></div>}
                      {choisie.adresse && <div><dt>Siège</dt><dd>{choisie.adresse}</dd></div>}
                      {choisie.qualite && <div><dt>Votre qualité</dt><dd>{choisie.qualite}</dd></div>}
                    </dl>
                  ) : null;
                })()}

                <fieldset className={'rnpp-card' + (data.entrepriseApiex ? ' rnpp-card--verified' : '')}>
                  <legend className="rnpp-card__legend">
                    Informations sur l'agence de voyage
                    {data.entrepriseApiex && <span className="rnpp-card__badge">APIEX</span>}
                  </legend>
                  <div className="form-grid">
                    <Field label="Raison sociale" required>
                      <input
                        value={data.raisonSociale}
                        disabled={!!data.entrepriseApiex || apiex.phase === 'loading'}
                        placeholder="Dénomination de la société"
                        onChange={(e) => patch({ raisonSociale: e.target.value })}
                      />
                    </Field>
                    <Field label="RCCM" required>
                      <input
                        value={data.rccm}
                        disabled={!!data.entrepriseApiex || apiex.phase === 'loading'}
                        placeholder="Ex. RB/COT/24 B 12345"
                        onChange={(e) => patch({ rccm: e.target.value })}
                      />
                    </Field>
                    <Field label="Nom commercial de l'établissement" required>
                      <input value={data.nomCommercial} placeholder="Nom sous lequel l'agence est connue" onChange={(e) => patch({ nomCommercial: e.target.value })} />
                    </Field>
                    <Field label="Téléphone de l'agence" required error={errors.telAgence}>
                      {/* Indicatif choisi par drapeau (Bénin par défaut) ; la
                          valeur est gardée au format international (+229…). */}
                      <PhoneInput
                        international
                        countryCallingCodeEditable={false}
                        defaultCountry="BJ"
                        labels={libellesPays}
                        value={data.telAgence ? String(data.telAgence).replace(/[^\d+]/g, '') : undefined}
                        placeholder="01 00 00 00 00"
                        className={'phone-input' + (errors.telAgence ? ' is-invalid' : '')}
                        aria-invalid={errors.telAgence ? 'true' : undefined}
                        onChange={(valeur) => patch({ telAgence: valeur || '' })}
                      />
                    </Field>
                  </div>
                  <span className="field-hint">
                    Il s'agit du numéro de l'agence, et non des contacts personnels du promoteur ou du gérant.
                  </span>
                </fieldset>

                {data.entrepriseApiex && data.ifu ? (
                  <div className="form-grid">
                    <Field label="IFU de l'entreprise (fourni par l'APIEX)">
                      <input value={data.ifu} disabled />
                    </Field>
                  </div>
                ) : (
                <div className="npi-lookup">
                  <div className="npi-lookup__header">
                    <span className="npi-lookup__title">IFU de l'entreprise (DGI)</span>
                  </div>
                  <p className="npi-lookup__hint">Facultatif. Un IFU saisi doit être vérifié auprès de la DGI.</p>
                  <div className="npi-lookup__row">
                    <input
                      inputMode="numeric"
                      maxLength={13}
                      placeholder="Ex. 3202012345678"
                      autoComplete="off"
                      aria-label="IFU de l'entreprise"
                      value={data.ifu}
                      onChange={(e) => { patch({ ifu: e.target.value }); if (ifuStatus) setIfuStatus(null); }}
                    />
                    <button type="button" className="btn btn-primary" disabled={ifuLoading} onClick={ifuVerify}>Vérifier l'IFU</button>
                  </div>
                  <Status status={ifuStatus} />
                  {manque('ifu') && !ifuLoading && (
                    <span className="field-hint">Vérifiez cet IFU pour continuer, ou laissez le champ vide.</span>
                  )}
                </div>
                )}

                <div className="form-grid">
                  <Field label="Année de démarrage effectif des activités d'organisation de voyage" required>
                    <select value={data.anneeDemarrage} onChange={(e) => patch({ anneeDemarrage: e.target.value })}>
                      <option value="">—</option>
                      {annees.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="field-group">
                  <span className="field-group__label">Catégorie d'agence <span className="form-field__required" aria-hidden="true">*</span></span>
                  <Choix name="categorie" options={categories} value={data.categorie} onChange={(v) => patch({ categorie: v })} />
                </div>

                <div className="field-group">
                  <span className="field-group__label">Régime de l'entreprise <span className="form-field__required" aria-hidden="true">*</span></span>
                  <Choix name="regime" options={regimes} value={data.regime} onChange={(v) => patch({ regime: v })} colonnes={4} />
                </div>
                {data.regime === 'autre' && (
                  <div className="form-grid">
                    <Field label="Précisez le régime concerné" required>
                      <input value={data.regimeAutre} onChange={(e) => patch({ regimeAutre: e.target.value })} />
                    </Field>
                  </div>
                )}
              </div>
            )}

            {/* Étape 3 — Implantation */}
            {!done && step === 3 && (
              <div className="form-step">
                <div className="field-group">
                  <span className="field-group__label">Type de structure <span className="form-field__required" aria-hidden="true">*</span></span>
                  <Choix name="typeStructure" options={typesStructure} value={data.typeStructure} onChange={(v) => patch({ typeStructure: v })} />
                </div>

                {data.typeStructure === 'physique' && (
                  <>
                    <div className="form-grid">
                      <Field label="Département" required>
                        <select value={data.departement} onChange={(e) => patch({ departement: e.target.value, commune: '' })}>
                          <option value="">—</option>
                          {departements.map((d) => <option key={d}>{d}</option>)}
                        </select>
                      </Field>
                      <Field label="Commune" required>
                        <select value={data.commune} disabled={!data.departement} onChange={(e) => patch({ commune: e.target.value })}>
                          <option value="">{data.departement ? '—' : "Choisissez d'abord le département"}</option>
                          {communesProposees.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </Field>
                      <Field label="Arrondissement" required>
                        <input value={data.arrondissement} onChange={(e) => patch({ arrondissement: e.target.value })} />
                      </Field>
                      <Field label="Quartier / village" required>
                        <input value={data.quartier} onChange={(e) => patch({ quartier: e.target.value })} />
                      </Field>
                      <Field label="Carré / maison">
                        <input value={data.carreMaison} onChange={(e) => patch({ carreMaison: e.target.value })} />
                      </Field>
                      <Field label="Références du lot">
                        <input value={data.lotReference} onChange={(e) => patch({ lotReference: e.target.value })} />
                      </Field>
                    </div>

                    <div className="npi-lookup">
                      <div className="npi-lookup__header">
                        <span className="npi-lookup__title">Localisation de l'agence</span>
                      </div>
                      <p className="npi-lookup__hint">
                        Donnez une brève indication géographique avec un repère facile à retrouver
                        (obligatoire). Les coordonnées GPS sont facultatives.
                      </p>
                      <div className="form-grid">
                        <Field label="Latitude" error={errors.gpsLatitude}>
                          <input inputMode="decimal" placeholder="Ex. 6.365360" value={data.gpsLatitude} onChange={(e) => patch({ gpsLatitude: e.target.value })} />
                        </Field>
                        <Field label="Longitude" error={errors.gpsLongitude}>
                          <input inputMode="decimal" placeholder="Ex. 2.418310" value={data.gpsLongitude} onChange={(e) => patch({ gpsLongitude: e.target.value })} />
                        </Field>
                      </div>
                      <div className="npi-lookup__otp-actions">
                        <button type="button" className="npi-lookup__link" onClick={localiser}>Utiliser ma position actuelle</button>
                      </div>
                      <Status status={gpsStatus} />
                      <Field label="Indication géographique" required>
                        <textarea
                          rows={2}
                          placeholder="Ex. Face à la pharmacie du carrefour, 2e rue à gauche"
                          value={data.indicationGeo}
                          aria-invalid={manque('indicationGeo') ? 'true' : undefined}
                          onChange={(e) => patch({ indicationGeo: e.target.value })}
                        />
                      </Field>
                    </div>
                  </>
                )}

                {data.typeStructure && (
                  <div className="form-grid">
                    <Field label="Site internet" required={data.typeStructure === 'en_ligne'} error={errors.siteWeb}>
                      <input
                        type="url"
                        placeholder="https://www.mon-agence.bj"
                        value={data.siteWeb}
                        aria-invalid={errors.siteWeb ? 'true' : undefined}
                        onChange={(e) => patch({ siteWeb: e.target.value })}
                      />
                    </Field>
                    <Field label="Adresse postale">
                      <input placeholder="Ex. 01 BP 1234 Cotonou" value={data.adressePostale} onChange={(e) => patch({ adressePostale: e.target.value })} />
                    </Field>
                  </div>
                )}
                {data.typeStructure === 'en_ligne' && (
                  <span className="field-hint">Pour une agence en ligne, l'adresse du site internet est obligatoire.</span>
                )}
              </div>
            )}

            {/* Étape 4 — Situation et pièces */}
            {!done && step === 4 && (
              <div className="form-step">
                {/* Retour de paiement (3-D Secure, page rechargée) : le
                    règlement est acquis, il ne manque que les pièces. */}
                {paiement && paiementStatus && <Status status={paiementStatus} />}
                {pieces.length > 0 && (
                  <>
                    <p className="step-intro">
                      Documents à joindre
                      {data.regime === 'A' ? ' — les statuts ne sont pas demandés au régime A' : ''}.
                      Formats PDF, JPG, PNG ou WEBP, 5 Mo maximum par fichier.
                      {' '}Les pièces « du gérant » concernent{' '}
                      {data.gerantEstRepresentant === 'non'
                        ? (data.gerantNom ? <strong>{data.gerantPrenom} {data.gerantNom}</strong> : 'le gérant indiqué à l’étape 1')
                        : data.gerantEstRepresentant === 'oui'
                          ? 'le représentant légal, qui est aussi le gérant'
                          : 'le gérant de l’agence indiqué à l’étape 1'}.
                    </p>
                    {pieces.map((cle) => {
                      const multiple = PIECES_MULTIPLES.includes(cle);
                      const max = multiple ? maxExperiences : 1;
                      return (
                        <div className="upload-card" key={cle}>
                          <div className="upload-card__title-row">
                            <span className="upload-card__title">{PIECES[cle]?.titre || cle}</span>
                            <span className="badge-required">Obligatoire</span>
                          </div>
                          {PIECES[cle]?.aide && (
                            <p className="upload-card__desc">
                              {PIECES[cle].aide}{multiple ? ` ${max} fichiers maximum.` : ''}
                            </p>
                          )}
                          <Dropzone
                            id={'upload-' + cle}
                            files={data.uploads[cle] || []}
                            onChange={(liste) => setUpload(cle, liste)}
                            max={max}
                            invalid={manque('piece-' + cle)}
                          />
                        </div>
                      );
                    })}
                  </>
                )}

                <div className="npi-lookup">
                  <div className="npi-lookup__header">
                    <span className="npi-lookup__title">Casier judiciaire — Ministère de la Justice</span>
                  </div>
                  <p className="npi-lookup__hint">
                    Le casier judiciaire du représentant légal est consulté directement auprès du Ministère
                    de la Justice à partir de son NPI : vous n'avez aucun document à fournir.
                  </p>
                  {casier.phase === 'loading' && (
                    <Status status={{ kind: 'loading', text: 'Consultation du casier judiciaire…' }} />
                  )}
                  {casier.phase === 'done' && casier.valide && (
                    <Status status={{
                      kind: 'success',
                      text: `✓ Un casier judiciaire en cours de validité est disponible${casier.dateExpiration ? ` (valable jusqu'au ${casier.dateExpiration})` : ''}. Il sera joint à votre dossier.`
                    }} />
                  )}
                  {casier.phase === 'done' && !casier.valide && (
                    <Status status={{
                      kind: 'info',
                      text: `Aucun casier judiciaire en cours de validité n'est disponible : il sera établi auprès du Ministère de la Justice après le paiement de ${formatMontant(montants?.fraisCasier)} au récapitulatif.`
                    }} />
                  )}
                  {casier.phase === 'echec' && (
                    <>
                      <Status status={{ kind: 'error', text: casier.message }} />
                      <div className="npi-lookup__otp-actions">
                        <button type="button" className="npi-lookup__link" onClick={() => chargerCasier(true)}>Réessayer</button>
                      </div>
                    </>
                  )}
                  {casier.phase === 'sans-npi' && (
                    <div className="npi-lookup__row">
                      <button type="button" className="btn btn-ghost" onClick={reprendreVerificationNpi}>
                        Reprendre la vérification de mon NPI
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Étape 5 — Engagement et envoi */}
            {!done && step === 5 && (
              <div className="form-step">
                <div className="recap">
                  <h3 className="recap__title">Récapitulatif</h3>
                  <dl className="recap__list">
                    <div><dt>Représentant légal</dt><dd>{data.prenom} {data.nom} · {data.email}</dd></div>
                    <div>
                      <dt>Gérant</dt>
                      <dd>
                        {data.gerantEstRepresentant === 'non'
                          ? `${data.gerantPrenom} ${data.gerantNom} (NPI ${data.gerantNpi})`
                          : 'Le représentant légal'}
                      </dd>
                    </div>
                    <div><dt>Agence</dt><dd>{data.nomCommercial} — {data.raisonSociale} ({data.rccm})</dd></div>
                    <div><dt>Catégorie · régime</dt><dd>{libelle(categories, data.categorie)} · {data.regime === 'autre' ? data.regimeAutre : libelle(regimes, data.regime)}</dd></div>
                    <div>
                      <dt>Implantation</dt>
                      <dd>
                        {data.typeStructure === 'physique'
                          ? [data.quartier, data.arrondissement, data.commune, data.departement].filter(Boolean).join(', ')
                          : `Agence en ligne — ${data.siteWeb}`}
                      </dd>
                    </div>
                    <div>
                      <dt>Casier judiciaire</dt>
                      <dd>{casier.valide ? 'Disponible au Ministère de la Justice' : 'À établir après paiement'}</dd>
                    </div>
                    <div>
                      <dt>Pièces jointes</dt>
                      <dd>{pieces.reduce((n, cle) => n + (data.uploads[cle] || []).length, 0)} fichier(s) pour {pieces.length} pièce(s)</dd>
                    </div>
                  </dl>
                </div>

                <div className="engagement-list">
                  {engagementsAffiches.map((label, i) => (
                    <label className="engagement-item" key={i}>
                      <input type="checkbox" checked={!!data.engagements[i]} onChange={() => toggleEngagement(i)} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <div className="recap frais">
                  <h3 className="recap__title">Frais à régler</h3>
                  {montants ? (
                    <dl className="recap__list">
                      <div><dt>Frais de dossier</dt><dd>{formatMontant(montants.fraisDossier)}</dd></div>
                      {montants.fraisCasier > 0 && (
                        <div><dt>Établissement du casier judiciaire</dt><dd>{formatMontant(montants.fraisCasier)}</dd></div>
                      )}
                      <div className="frais__total"><dt>Total</dt><dd>{formatMontant(montants.montant)}</dd></div>
                    </dl>
                  ) : (
                    <Status status={{ kind: 'loading', text: 'Calcul des frais…' }} />
                  )}
                  {paiement ? (
                    <p className="field-hint">
                      ✓ Frais réglés{paiement.operateur ? ` par ${paiement.operateur}` : ''} — référence {paiement.reference}.
                      Il ne reste qu'à soumettre votre demande.
                    </p>
                  ) : (
                    <p className="field-hint">
                      Paiement par Mobile Money (MTN, Moov, Celtiis) ou carte bancaire. Votre demande est
                      soumise dès le paiement confirmé.
                    </p>
                  )}
                </div>
                {paiementStatus && <Status status={paiementStatus} />}
                {submitStatus && <Status status={submitStatus} />}
              </div>
            )}

            {/* Confirmation */}
            {done && (
              <div className="form-step">
                <div className="confirm-panel">
                  <div className="confirm-panel__check">✓</div>
                  <h3 className="confirm-panel__title">Dossier transmis</h3>
                  <p className="confirm-panel__text">
                    Votre demande est consignée. Un récapitulatif vous a été envoyé par email. Le dossier
                    ne sera déclaré reçu qu'après examen de la conformité des pièces par les services
                    compétents de l'administration du tourisme.
                  </p>
                  <div className="confirm-panel__tracking">
                    <span className="confirm-panel__tracking-label">Suivi</span>
                    <span className="confirm-panel__tracking-value">{created.trackingId}</span>
                  </div>
                  <p className="confirm-panel__text">
                    <a href={`/?suivi=${encodeURIComponent(created.trackingId)}`}>Suivre l'état de mon dossier →</a>
                  </p>
                  {created.piecesEnEchec?.length > 0 && (
                    <p className="confirm-panel__text">
                      Ces pièces n'ont pas pu être transmises : {created.piecesEnEchec.join(', ')}. Vous
                      pourrez les ajouter depuis la page de suivi de votre dossier.
                    </p>
                  )}
                  <div className="confirm-panel__actions">
                    <p className="confirm-panel__text">
                      Vous enregistrez une autre agence ? Notez d'abord ce numéro de suivi : il ne sera plus affiché.
                    </p>
                    <button type="button" className="btn btn-ghost" onClick={() => reinitialiserFormulaire()}>
                      Nouvelle demande
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!done && (
            <div className="form-nav">
              <button type="button" className="btn btn-ghost" onClick={goPrev} disabled={step === 1 || submitting}>
                Précédent
              </button>
              <span className="form-nav__spacer"></span>
              <button type="submit" className="btn btn-primary" disabled={submitting || requisManquants.length > 0}>
                {step !== STEP_COUNT
                  ? 'Continuer'
                  : submitting
                    ? 'Traitement en cours…'
                    : paiement || !montants
                      ? 'Soumettre ma demande'
                      : `Payer ${formatMontant(montants.montant)} et soumettre`}
              </button>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
