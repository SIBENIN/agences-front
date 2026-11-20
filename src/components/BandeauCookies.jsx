import React, { useEffect, useState } from 'react';
import {
  enregistrerConsentement,
  lireConsentement,
  mesureAudienceActive,
  surOuvertureBandeau
} from '../lib/mesureAudience.js';

/**
 * Bandeau de consentement à la mesure d'audience. Il s'affiche tant que
 * l'usager n'a pas choisi, et se rouvre depuis « Gérer les cookies » en pied
 * de page. « Accepter » et « Refuser » ont volontairement le même poids :
 * refuser doit être aussi simple qu'accepter.
 */
export default function BandeauCookies() {
  const [visible, setVisible] = useState(() => mesureAudienceActive && lireConsentement() === null);

  useEffect(() => surOuvertureBandeau(() => setVisible(true)), []);

  if (!mesureAudienceActive || !visible) return null;

  const choisir = (accepte) => {
    enregistrerConsentement(accepte);
    setVisible(false);
  };

  return (
    <div className="bandeau-cookies" role="dialog" aria-labelledby="bandeau-cookies-titre">
      <h2 className="bandeau-cookies__titre" id="bandeau-cookies-titre">
        <span aria-hidden="true">🍪</span> Votre confidentialité compte
      </h2>
      <p className="bandeau-cookies__texte">
        Ce site utilise des cookies pour assurer son bon fonctionnement, améliorer votre expérience de
        navigation et mesurer son audience. Vous pouvez accepter ou refuser leur utilisation.
      </p>
      <div className="bandeau-cookies__actions">
        <button type="button" className="btn btn-ghost btn-pill" onClick={() => choisir(false)}>
          Refuser
        </button>
        <button type="button" className="btn btn-ghost btn-pill" onClick={() => choisir(true)}>
          Accepter
        </button>
      </div>
    </div>
  );
}
