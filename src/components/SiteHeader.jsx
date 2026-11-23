import React from 'react';

/**
 * En-tête du site, commun à toutes les pages : le logo du ministère, le nom du
 * dispositif, et les deux chemins d'un usager — déposer une demande ou suivre
 * un dossier. Collant en haut de l'écran.
 *
 * `suivi` à faux retire le lien de suivi (registre pas encore ouvert).
 */
export default function SiteHeader({ suivi = true }) {
  return (
    <header className="site-header">
      <div className="site-header__flag" aria-hidden="true"><span></span><span></span><span></span></div>
      <div className="site-header__bar">
        <a className="site-header__brand" href="/" aria-label="Accueil — Recensement des agences de voyage">
          <img
            className="site-header__logo"
            src="/assets/logo mtce.png"
            alt="Ministère du Tourisme et du Commerce Extérieur"
          />
          <span className="site-header__sep" aria-hidden="true"></span>
          <span className="site-header__titles">
            <span className="site-header__title">Agences de voyage</span>
            <span className="site-header__subtitle">Licences &amp; recensement</span>
          </span>
        </a>

        <nav className="site-header__nav" aria-label="Navigation principale">
          {suivi && <a className="site-header__link" href="/?suivi=">Suivre mon dossier</a>}
          <a className="site-header__link" href="/?page=faq">FAQ</a>
          <a className="site-header__cta" href="/#form-start">
            Déposer ma demande
          </a>
        </nav>
      </div>
    </header>
  );
}
