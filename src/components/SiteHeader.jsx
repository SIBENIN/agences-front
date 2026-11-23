import React, { useEffect, useState } from 'react';

/**
 * En-tête du site, commun à toutes les pages : le logo du ministère, le nom du
 * dispositif, et les deux chemins d'un usager — déposer une demande ou suivre
 * un dossier.
 *
 * `suivi` à faux retire le lien de suivi (registre pas encore ouvert).
 *
 * `superpose` (accueil) : l'en-tête flotte au-dessus de la photographie du
 * bandeau, transparent, et ne prend son fond blanc qu'une fois la page
 * défilée.
 */
export default function SiteHeader({ suivi = true, superpose = false }) {
  const [defile, setDefile] = useState(false);

  useEffect(() => {
    if (!superpose) return undefined;
    const surDefilement = () => setDefile(window.scrollY > 24);
    surDefilement();
    window.addEventListener('scroll', surDefilement, { passive: true });
    return () => window.removeEventListener('scroll', surDefilement);
  }, [superpose]);

  const classes = 'site-header' +
    (superpose ? ' site-header--superpose' : '') +
    (superpose && !defile ? ' site-header--transparent' : '');

  return (
    <header className={classes}>
      <div className="site-header__flag" aria-hidden="true"><span></span><span></span><span></span></div>
      <div className="site-header__bar">
        <a className="site-header__brand" href="/" aria-label="Accueil — Recensement des agences de voyage">
          <img
            className="site-header__logo"
            src="/assets/logo mtce.png"
            alt="Ministère du Tourisme et du Commerce Extérieur"
          />
          <span className="site-header__sep" aria-hidden="true"></span>
          <img
            className="site-header__logo site-header__logo--bt"
            src="/assets/Logo BT.png"
            alt="Agence béninoise pour le développement du tourisme"
          />
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
