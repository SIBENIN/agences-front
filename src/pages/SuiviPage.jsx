import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import ComplementDossier from '../components/ComplementDossier.jsx';

/**
 * Suivi d'un dossier par son numéro — la page qu'ouvre le lien de l'accusé de
 * réception (`/?suivi=AV-26-4831KDPQ`).
 *
 * Elle ne dit que l'état d'avancement : ni identité, ni pièces, ni données
 * judiciaire. Seule exception, tant qu'une pièce manque (justificatif
 * d'activité sous le plafond, diplôme), la page propose de l'ajouter — après
 * un code reçu à l'adresse email du dossier (cf. ComplementDossier). Le numéro de suivi circule par courriel et peut être lu par un
 * tiers ; l'API a été écrite dans le même esprit
 * (`GET /public/demandes/{trackingId}` ne renvoie aucune donnée personnelle).
 */

const ETATS = {
  en_instruction: {
    ton: 'attente',
    titre: 'Dossier en instruction',
    texte: "Votre dossier est en cours d’examen par les services de l’administration du tourisme. Il ne sera déclaré reçu qu’après vérification de la conformité des pièces. Vous serez informé(e) de la suite par email."
  },
  pre_enregistre: {
    ton: 'attente',
    titre: 'Dossier pré-enregistré',
    texte: "Votre dossier a été examiné et jugé conforme : il est pré-enregistré. La décision finale sur votre demande de licence vous sera notifiée par email."
  },
  autorise: {
    ton: 'succes',
    titre: 'Demande acceptée',
    texte: "Votre demande a reçu une suite favorable : l’agence est inscrite au répertoire des agences de voyage et de tourisme. La notification vous a été transmise par email."
  },
  rejete: {
    ton: 'refus',
    titre: 'Demande non retenue',
    texte: "Votre demande n’a pas pu recevoir une suite favorable. La notification vous a été transmise par email."
  }
};

/** « AV-26-4831KDPQ » — on tolère les espaces et les minuscules à la saisie. */
function normaliser(valeur) {
  return valeur.replace(/\s+/g, '').toUpperCase();
}

function formaterDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export default function SuiviPage({ numeroInitial = '' }) {
  const [numero, setNumero] = useState(numeroInitial);
  const [dossier, setDossier] = useState(null);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  // Le demandeur vient de compléter son dossier depuis cette page.
  const [complete, setComplete] = useState(false);

  // Numéro déjà dans l'URL (lien de l'accusé de réception) : on interroge
  // sans attendre que le visiteur clique.
  useEffect(() => {
    if (numeroInitial) rechercher(normaliser(numeroInitial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function rechercher(reference) {
    setChargement(true);
    setErreur('');
    setDossier(null);
    setComplete(false);

    try {
      const resultat = await api.suivre(reference);
      setDossier(resultat);
      // L'adresse porte désormais le dossier consulté : la page se recharge,
      // se met en favori et se repartage telle quelle.
      window.history.replaceState(null, '', `/?suivi=${encodeURIComponent(reference)}`);
    } catch (err) {
      setErreur(err.status === 404
        ? "Aucun dossier ne porte ce numéro. Vérifiez votre saisie : il figure dans le courriel reçu après le dépôt, sous la forme AV-26-0000AAAA."
        : (err.message || 'Le service est momentanément indisponible. Réessayez dans quelques instants.'));
    } finally {
      setChargement(false);
    }
  }

  function soumettre(event) {
    event.preventDefault();
    const reference = normaliser(numero);
    if (!reference) {
      setErreur('Saisissez le numéro de suivi reçu lors du dépôt de votre dossier.');
      return;
    }
    rechercher(reference);
  }

  /**
   * Pièces ajoutées : la date de mise à jour est relue, sans vider la page.
   * Le bloc de complément reste affiché pour son message de confirmation,
   * même si le dossier n'est plus incomplet.
   */
  async function apresComplement() {
    setComplete(true);
    try {
      setDossier(await api.suivre(dossier.trackingId));
    } catch (err) {
      // le dossier affiché reste valable, seule la date n'est pas rafraîchie
    }
  }

  const etat = dossier ? (ETATS[dossier.status] || ETATS.en_instruction) : null;

  return (
    <main className="page-main suivi" id="contenu">
      <div className="suivi__intro">
        <span className="eyebrow">Recensement des agences de voyage</span>
        <h1>Suivi de votre dossier</h1>
        <p>
          Saisissez le numéro de suivi remis lors du dépôt de votre demande — il figure
          également dans l'email de confirmation.
        </p>
      </div>

      <form className="card suivi__form" onSubmit={soumettre}>
        <label className="form-field">
          <span className="form-field__label">Numéro de suivi</span>
          <input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="AV-26-0000AAAA"
            autoComplete="off"
            spellCheck="false"
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={chargement}>
          {chargement ? 'Recherche…' : 'Consulter'}
        </button>
      </form>

      {erreur && <div className="npi-lookup__status npi-lookup__status--error suivi__message">{erreur}</div>}

      {dossier && etat && (
        <section className={'card suivi__resultat suivi__resultat--' + etat.ton}>
          <span className="eyebrow">Dossier {dossier.trackingId}{dossier.agence ? ` · ${dossier.agence}` : ''}</span>
          <h2>{etat.titre}</h2>
          <p className="suivi__texte">{etat.texte}</p>
          {dossier.noteExterne && (
            <div className="suivi__note">
              <strong>Observations de l'administration</strong>
              <p>{dossier.noteExterne}</p>
            </div>
          )}
          {dossier.numeroLicence && (
            <p className="suivi__texte">Numéro de licence : <strong>{dossier.numeroLicence}</strong></p>
          )}

          <dl className="suivi__dates">
            <div>
              <dt>Déposé le</dt>
              <dd>{formaterDate(dossier.submittedAt) || '—'}</dd>
            </div>
            <div>
              <dt>Dernière mise à jour</dt>
              <dd>{formaterDate(dossier.updatedAt) || '—'}</dd>
            </div>
          </dl>

          {/* En instruction, le demandeur peut corriger ou compléter ses pièces
              diplôme (retirer, remplacer, ajouter), après un code envoyé à
              l'adresse email du dossier. */}
          {(dossier.modifiable || complete) && (
            <ComplementDossier
              key={dossier.trackingId}
              trackingId={dossier.trackingId}
              onTermine={apresComplement}
            />
          )}
        </section>
      )}

      <p className="suivi__retour">
        <a href="/">← Retour au formulaire</a>
      </p>
    </main>
  );
}
