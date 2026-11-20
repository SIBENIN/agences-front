import React from 'react';
import { useReferentiels } from '../context/ReferentielsContext.jsx';

export default function Hero() {
  // Registre programmé (date d'ouverture pas encore atteinte) : aucun dossier
  // n'a encore pu être déposé, le lien de suivi n'aurait rien à montrer.
  // L'appel à l'inscription reste : il mène à l'annonce de la date.
  const { ouvert, programme } = useReferentiels();
  const masquerSuivi = !ouvert && programme;

  return (
    <section className="hero">
      <div className="hero__texture" aria-hidden="true"></div>
      <div className="hero__inner">
        <div className="hero__content">
          <span className="hero__badge hero-anim hero-anim-1">
            <span className="hero__badge-flag" aria-hidden="true"><span></span><span></span><span></span></span>
            Recensement des agences de voyage
          </span>
          <h1 className="hero__title hero-anim hero-anim-2">
            Enregistrez votre<br /><span className="hero__title-accent">agence de voyage</span>
          </h1>
          <div className="hero__divider hero-anim hero-anim-2"></div>
          <p className="hero__text hero-anim hero-anim-3">
            Le ministère du Tourisme et du Commerce extérieur recense les agences de voyage et de
            tourisme exerçant au Bénin, afin de constituer le répertoire officiel des opérateurs du
            secteur.
          </p>
          <p className="hero__text hero-anim hero-anim-4">
            Agences billettistes, réceptives ou tour-opérateurs, physiques ou en ligne : déposez ici
            la demande de licence de votre nouvelle agence.
          </p>
          <div className="hero__actions hero-anim hero-anim-6">
            <a className="hero__cta" href="#form-start">
              Déposer ma demande <span className="hero__cta-arrow" aria-hidden="true">→</span>
            </a>
            {!masquerSuivi && <a className="hero__lien" href="/?suivi=">Suivre mon dossier</a>}
          </div>
        </div>

        <div className="hero__visual hero-anim hero-anim-3">
          <div className="hero__photo-frame">
            {/* WebP d'abord, JPEG pour les navigateurs qui l'ignorent : la
                même photographie, 95 Ko au lieu de 165. `width`/`height`
                réservent la place avant le chargement — sans eux, le bandeau
                sursaute quand l'image arrive. */}
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
            <div className="hero__photo-shade" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
