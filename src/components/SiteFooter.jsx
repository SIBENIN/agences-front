import React from 'react';
import { INSTITUTION } from '../lib/institution.js';
import { mesureAudienceActive, ouvrirBandeauCookies } from '../lib/mesureAudience.js';

/**
 * Comptes officiels de Bénin Tourisme. Les icônes sont dessinées en SVG plutôt
 * qu'importées : deux glyphes ne justifient pas une bibliothèque d'icônes dans
 * un site qui n'a pour toute dépendance que React.
 */
const RESEAUX = [
  {
    nom: 'Facebook',
    url: 'https://www.facebook.com/profile.php?id=61580802032137',
    chemin: (
      <path
        fill="currentColor"
        d="M13.5 21v-7.1h2.4l.4-2.8h-2.8V9.3c0-.8.2-1.4 1.4-1.4h1.5V5.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2h-2.5v2.8h2.5V21z"
      />
    )
  },
  {
    nom: 'LinkedIn',
    url: 'https://www.linkedin.com/company/benin-tourisme',
    chemin: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="7.6" cy="7.8" r="1.3" fill="currentColor" />
        <path fill="currentColor" d="M6.6 10.4h2v7h-2zM10.4 10.4h1.9v1c.4-.7 1.2-1.2 2.2-1.2 1.7 0 2.7 1.1 2.7 3v4.2h-2v-3.8c0-1-.4-1.6-1.3-1.6s-1.5.6-1.5 1.6v3.8h-2z" />
      </>
    )
  }
];

/** `suivi` à faux retire le lien de suivi (registre pas encore ouvert). */
export default function SiteFooter({ suivi = true }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <div className="site-footer__brand">
          <div className="site-footer__logo">
            <img className="site-footer__logo-agence" src="/assets/Logo BT.png" alt="Agence béninoise pour le développement du tourisme" />
            <img className="site-footer__logo-ministere" src="/assets/logo mtce.png" alt="Ministère du Tourisme et du Commerce Extérieur" />
          </div>
          <p className="site-footer__desc">
            Recensement des agences de voyage et de tourisme — un dispositif du Ministère du Tourisme et du
            Commerce Extérieur pour professionnaliser le secteur.
          </p>
        </div>

        <div className="site-footer__col">
          <span className="site-footer__col-title">Liens utiles</span>
          {/* Sites institutionnels : nouvel onglet, pour ne pas faire perdre
              au visiteur le formulaire qu'il est en train de remplir. */}
          <a href="https://www.instagram.com/mtcebenin" target="_blank" rel="noreferrer">
            Ministère du Tourisme et du Commerce Extérieur
          </a>
          <a href="https://benintourisme.bj" target="_blank" rel="noreferrer">
            Bénin Tourisme
          </a>
          {/* Même adresse que le bouton de l'accusé de réception, sans
              numéro : la page ouvre son champ de recherche. */}
          {suivi && <a href="/?suivi=">Suivre mon dossier</a>}
          {/* La FAQ suit le suivi, et non les mentions légales : ce sont les
              deux liens d'un usager qui a une question sur sa démarche, pas
              d'un lecteur qui cherche qui édite le site. */}
          <a href="?page=faq">Questions fréquentes</a>
        </div>

        {/* Rubrique légale : un site de l'État doit dire qui l'édite et ce
            qu'il fait des données qu'il collecte, et le dire depuis toutes ses
            pages. */}
        <div className="site-footer__col">
          <span className="site-footer__col-title">Informations</span>
          <a href="?page=mentions-legales">Mentions légales</a>
          <a href="?page=confidentialite">Politique de confidentialité</a>
          {mesureAudienceActive && (
            <button type="button" className="site-footer__lien-bouton" onClick={ouvrirBandeauCookies}>
              Gérer les cookies
            </button>
          )}
        </div>

        <div className="site-footer__col">
          <span className="site-footer__col-title">Contact</span>
          <a href={'mailto:' + INSTITUTION.email}>{INSTITUTION.email}</a>
          {/* Téléphone et adresse ne sont pas écrits en dur : ils viennent de
              `lib/institution.js`, et tant que l'administration ne les a pas
              arrêtés, mieux vaut ne rien afficher qu'un numéro inventé. */}
          {INSTITUTION.telephone ? (
            <a href={'tel:' + INSTITUTION.telephone.replace(/\s+/g, '')}>
              {INSTITUTION.telephone}
              {INSTITUTION.horaires ? <span className="site-footer__horaires"> — {INSTITUTION.horaires}</span> : null}
            </a>
          ) : null}
          {INSTITUTION.adresse ? <span className="site-footer__adresse">{INSTITUTION.adresse}</span> : null}

          <div className="site-footer__reseaux">
            {RESEAUX.map(({ nom, url, chemin }) => (
              <a
                key={nom}
                className="site-footer__reseau"
                href={url}
                aria-label={nom}
                title={nom}
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false">
                  {chemin}
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="site-footer__divider"></div>
      <div className="site-footer__bottom">
        <span className="site-footer__copyright">
          © {new Date().getFullYear()} République du Bénin — Ministère du Tourisme et du Commerce Extérieur
        </span>
        <div className="site-footer__flag"><span></span><span></span><span></span></div>
      </div>
    </footer>
  );
}
