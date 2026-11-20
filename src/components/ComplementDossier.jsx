import React, { useState } from 'react';
import { api } from '../api/client.js';
import { Dropzone, Status } from './FormControls.jsx';

/**
 * Ajout des pièces manquantes depuis la page de suivi : dossier en
 * instruction auquel une pièce exigée manque (envoi interrompu au dépôt).
 * Seules les pièces manquantes sont proposées.
 *
 * Le numéro de suivi circule par courriel : il ne suffit pas à toucher au
 * dossier. Un code part à l'adresse email du dossier ; une fois saisi, l'API
 * remet une URL signée et temporaire pour l'envoi des pièces.
 *
 * Phases : idle → envoi → code → verification → pieces → televersement → termine.
 */

/** Les fichiers rendus par l'API, au format de la Dropzone. */
function versDropzone(fichiers) {
  return (fichiers || []).map((f) => ({ id: f.id, name: f.name, size: f.size, existant: true }));
}

export default function ComplementDossier({ trackingId, onTermine }) {
  const [phase, setPhase] = useState('idle');
  const [statut, setStatut] = useState(null);
  const [session, setSession] = useState(null); // { emailMasque, expiresIn, codeDemo? }
  const [code, setCode] = useState('');
  const [acces, setAcces] = useState(null); // { uploadUrl, pieces, piecesAjoutables }
  // Par type de pièce : les fichiers choisis par le demandeur (les déjà
  // envoyés sont marqués `existant`).
  const [choix, setChoix] = useState({});

  async function demanderCode() {
    setPhase('envoi');
    setStatut({ kind: 'loading', text: 'Envoi du code de vérification…' });
    try {
      const reponse = await api.complementDemanderCode(trackingId);
      setSession(reponse);
      setCode('');
      setPhase('code');
      setStatut(null);
    } catch (err) {
      setPhase(session ? 'code' : 'idle');
      setStatut({ kind: 'error', text: err.message });
    }
  }

  function chargerPieces(reponse) {
    const depart = {};
    (reponse.pieces || []).forEach((p) => { depart[p.type] = versDropzone(p.fichiers); });
    setAcces((a) => ({ ...(a || {}), ...reponse }));
    setChoix(depart);
  }

  async function verifierCode(event) {
    event.preventDefault();
    const saisi = code.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(saisi)) {
      setStatut({ kind: 'error', text: 'Le code de vérification comporte 6 chiffres.' });
      return;
    }
    setPhase('verification');
    setStatut({ kind: 'loading', text: 'Vérification du code…' });
    try {
      chargerPieces(await api.complementVerifierCode(trackingId, saisi));
      setPhase('pieces');
      setStatut(null);
    } catch (err) {
      setPhase('code');
      setStatut({ kind: 'error', text: err.message });
    }
  }

  const piecesAffichees = (acces?.pieces || []).filter((p) => (acces.piecesAjoutables || []).includes(p.type));

  const aEnvoyer = Object.entries(choix).flatMap(([type, liste]) =>
    liste.filter((f) => !f.existant).map((file) => [type, file]));
  const modifie = aEnvoyer.length > 0;

  /** Envoi des pièces choisies ; ce qui échoue reste affiché, à retenter. */
  async function enregistrer() {
    setPhase('televersement');
    setStatut({ kind: 'loading', text: 'Mise à jour de votre dossier…' });
    const echecs = [];

    const envoyes = new Map();
    for (const [type, file] of aEnvoyer) {
      try {
        const piece = await api.televerserPiece(acces.uploadUrl, type, file);
        envoyes.set(file, { id: piece.id, name: piece.name, size: piece.size, existant: true });
      } catch (err) {
        echecs.push(`${file.name} (${err.message})`);
      }
    }

    const suivant = {};
    Object.entries(choix).forEach(([type, liste]) => {
      suivant[type] = liste.map((f) => envoyes.get(f) || f);
    });
    setChoix(suivant);

    if (echecs.length) {
      setPhase('pieces');
      setStatut({ kind: 'error', text: `Non enregistré : ${echecs.join(' · ')}` });
      return;
    }

    setPhase('termine');
    setStatut(null);
    onTermine?.();
  }

  if (phase === 'termine') {
    return (
      <div className="complement">
        <Status status={{ kind: 'success', text: '✓ Votre dossier a bien été mis à jour.' }} />
      </div>
    );
  }

  const enCours = phase === 'televersement';

  return (
    <div className="complement">
      {phase === 'idle' && (
        <>
          <p className="suivi__texte">
            Des pièces exigées manquent à votre dossier. Vous pouvez les ajouter après
            vérification d’un code envoyé à l’adresse email du dossier.
          </p>
          <button type="button" className="btn btn-primary" onClick={demanderCode}>
            Ajouter les pièces manquantes
          </button>
        </>
      )}

      {(phase === 'code' || phase === 'verification' || (phase === 'envoi' && session)) && (
        <form className="npi-lookup__otp" onSubmit={verifierCode}>
          <p className="npi-lookup__hint">
            Un code à 6 chiffres vient d'être envoyé à {session.emailMasque}. Il est valable{' '}
            {Math.round((session.expiresIn || 600) / 60)} minutes.
            {session.codeDemo && <> Code de démonstration : <strong>{session.codeDemo}</strong>.</>}
          </p>
          <div className="npi-lookup__row">
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="Code de vérification"
              autoComplete="one-time-code"
              aria-label="Code de vérification reçu par email"
              value={code}
              disabled={phase !== 'code'}
              onChange={(e) => setCode(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={phase !== 'code'}>
              Valider le code
            </button>
          </div>
          <div className="npi-lookup__otp-actions">
            <button type="button" className="npi-lookup__link" onClick={demanderCode} disabled={phase !== 'code'}>
              Renvoyer le code
            </button>
          </div>
        </form>
      )}

      {(phase === 'pieces' || enCours) && (
        <div className="complement__pieces">
          {piecesAffichees.map((piece) => (
            <div className="complement__bloc" key={piece.type}>
              <span className="complement__piece-titre">
                {piece.label}
                <span className="badge-required">Obligatoire</span>
              </span>
              {piece.multiple && <span className="field-hint">{piece.max} fichiers maximum.</span>}
              <Dropzone
                id={'complement-' + piece.type}
                files={choix[piece.type] || []}
                onChange={(liste) => setChoix((c) => ({ ...c, [piece.type]: liste }))}
                max={piece.max}
                disabled={enCours}
                invalid={!(choix[piece.type] || []).length}
              />
            </div>
          ))}

          <div className="complement__actions">
            <button type="button" className="btn btn-primary" disabled={!modifie || enCours} onClick={enregistrer}>
              {enCours ? 'Enregistrement…' : 'Enregistrer les pièces'}
            </button>
          </div>
        </div>
      )}

      {statut && <Status status={statut} />}
    </div>
  );
}
