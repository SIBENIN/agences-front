import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

/**
 * Listes de choix (servies par l'API, table `referentiels`) et paramètres
 * d'ouverture du recensement, chargés une fois au démarrage du formulaire.
 */
const ReferentielsContext = createContext(null);

const REFERENTIELS_VIDES = {
  departements: [], communes: [], communesParDepartement: {}, sexes: [], engagements: [],
  categories: [], regimes: [], typesStructure: [],
  statutsDemande: [], documents: [],
  anneeDemarrageMin: 1960, experiencesMax: 5
};

const PARAMETRES_PAR_DEFAUT = {
  open: true,
  statut: null,
  dateOuverture: null,
  messageFermeture: 'Le recensement des agences de voyage est actuellement fermé.',
  messageProgramme: ''
};

/** `?preview=1` laisse consulter le formulaire même fermé (pratique, pas une sécurité). */
function apercuForce() {
  try {
    return new URLSearchParams(window.location.search).get('preview') === '1';
  } catch (err) {
    return false;
  }
}

export function ReferentielsProvider({ children }) {
  const [etat, setEtat] = useState({ chargement: true, referentiels: null, parametres: null, erreur: '' });

  useEffect(() => {
    let annule = false;

    Promise.all([api.referentiels(), api.settings()])
      .then(([referentiels, parametres]) => {
        if (!annule) setEtat({ chargement: false, referentiels, parametres, erreur: '' });
      })
      .catch(() => {
        if (annule) return;
        setEtat({
          chargement: false,
          referentiels: null,
          parametres: null,
          erreur: "Le service de recensement est momentanément indisponible. Réessayez dans quelques instants."
        });
      });

    return () => { annule = true; };
  }, []);

  const value = useMemo(() => {
    const parametres = { ...PARAMETRES_PAR_DEFAUT, ...(etat.parametres || {}) };
    return {
      ...REFERENTIELS_VIDES,
      ...(etat.referentiels || {}),
      parametres,
      ouvert: parametres.open || apercuForce(),
      programme: !parametres.open && parametres.statut === 'programme' && !!parametres.dateOuverture,
      chargement: etat.chargement,
      erreur: etat.erreur
    };
  }, [etat]);

  return <ReferentielsContext.Provider value={value}>{children}</ReferentielsContext.Provider>;
}

export function useReferentiels() {
  const ctx = useContext(ReferentielsContext);
  if (!ctx) throw new Error('useReferentiels must be used within ReferentielsProvider');
  return ctx;
}
