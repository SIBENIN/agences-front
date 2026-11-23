import React from 'react';
import { useReferentiels } from '../context/ReferentielsContext.jsx';

/** Pictogrammes du bandeau, dessinés en SVG : trois glyphes ne justifient pas une bibliothèque. */
const ICONES = {
  ecran: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  bouclier: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  carte: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  loupe: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </>
  ),
  avion: (
    <path d="M10.5 13.5L3 11l1.5-1.5 8 1 4-4.5c.8-.8 2.2-.8 3 0s.8 2.2 0 3l-4.5 4 1 8L14.5 22l-2.5-7.5z" />
  )
};

function Icone({ nom }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ICONES[nom]}
    </svg>
  );
}

const ATOUTS = [
  { icone: 'ecran', texte: 'Démarche 100 % en ligne' },
  { icone: 'bouclier', texte: 'Identité vérifiée au RNPP' },
  { icone: 'carte', texte: 'Paiement en ligne sécurisé' }
];

const ETAPES = [
  { titre: 'Identification', texte: 'Le représentant légal confirme son NPI par un code SMS.' },
  { titre: 'Votre agence', texte: "Activités, implantation et coordonnées de l'agence." },
  { titre: 'Pièces & paiement', texte: 'Justificatifs, casier judiciaire et frais de dossier.' },
  { titre: 'Suivi & licence', texte: 'Un numéro de suivi pour consulter l’avancement du dossier.' }
];

export default function Hero() {
  // Registre programmé (date d'ouverture pas encore atteinte) : aucun dossier
  // n'a encore pu être déposé, le lien de suivi n'aurait rien à montrer.
  // L'appel à l'inscription reste : il mène à l'annonce de la date.
  const { ouvert, programme } = useReferentiels();
  const masquerSuivi = !ouvert && programme;

  return (
    <section className="hero">
      <div className="hero__grid" aria-hidden="true"></div>

      <div className="hero__inner">
        <h1 className="hero__title hero-anim hero-anim-1">
          La licence de votre <span className="hero__title-accent">agence de voyage</span>, en quelques étapes.
        </h1>
        <p className="hero__text hero-anim hero-anim-2">
          Le ministère du Tourisme et du Commerce extérieur constitue le répertoire officiel des
          agences de voyage et de tourisme du Bénin. Billettistes, réceptives ou tour-opérateurs,
          physiques ou en ligne : déposez ici la demande de licence de votre nouvelle agence.
        </p>
        <div className="hero__actions hero-anim hero-anim-3">
          <a className="hero__cta" href="#form-start">
            Déposer ma demande <span className="hero__cta-arrow" aria-hidden="true">→</span>
          </a>
          {!masquerSuivi && (
            <a className="hero__secondaire" href="/?suivi=">
              <Icone nom="loupe" /> Suivre mon dossier
            </a>
          )}
        </div>
        <ul className="hero__atouts hero-anim hero-anim-4">
          {ATOUTS.map(({ icone, texte }) => (
            <li key={texte}><span className="hero__atout-icone"><Icone nom={icone} /></span>{texte}</li>
          ))}
        </ul>
      </div>

      <div className="hero__scene hero-anim hero-anim-5">
        <div className="hero__photo-frame">
          {/* WebP d'abord, JPEG pour les navigateurs qui l'ignorent. `width`/
              `height` réservent la place avant le chargement. */}
          <picture>
            <source srcSet="/assets/home.webp" type="image/webp" />
            <img
              className="hero__photo"
              src="/assets/home.jpg"
              width="1400"
              height="933"
              alt="Visiteurs sur un site touristique du Bénin"
              loading="eager"
              decoding="async"
            />
          </picture>
          <div className="hero__photo-voile" aria-hidden="true"></div>
          <div className="hero__badge-photo" aria-hidden="true">
            <span className="hero__badge-photo-icone"><Icone nom="avion" /></span>
            <span>
              <strong>Toutes catégories d'agences</strong>
              <small>Billetterie · Réceptif · Tour-opérateur</small>
            </span>
          </div>
        </div>

        <ol className="hero__etapes" aria-label="Déroulé de la demande">
          {ETAPES.map(({ titre, texte }, i) => (
            <li key={titre} className="hero__etape">
              <span className="hero__etape-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="hero__etape-titre">{titre}</span>
              <span className="hero__etape-texte">{texte}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
