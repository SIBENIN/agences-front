import React from 'react';

/**
 * Bandeau d'accueil : une grande photographie en fond, voilée de bleu, et le
 * titre du dispositif par-dessus.
 */
export default function Hero() {
  return (
    <section className="hero">
      {/* WebP d'abord, JPEG pour les navigateurs qui l'ignorent. L'image est
          décorative : le titre porte le sens du bandeau. */}
      <picture className="hero__fond" aria-hidden="true">
        <source srcSet="/assets/home.webp" type="image/webp" />
        <img
          className="hero__photo"
          src="/assets/home.jpg"
          width="1400"
          height="933"
          alt=""
          loading="eager"
          decoding="async"
        />
      </picture>
      <div className="hero__voile" aria-hidden="true"></div>

      <div className="hero__inner">
        <h1 className="hero__title hero-anim">
          La licence de votre <span className="hero__title-accent">agence de voyage</span>
        </h1>
        <div className="hero__description hero-anim hero-anim-2">
          <p>
            Le ministère du Tourisme et du Commerce extérieur recense les agences de voyage et de
            tourisme exerçant au Bénin, afin de constituer le répertoire officiel des opérateurs du
            secteur et d'accompagner sa professionnalisation.
          </p>
          <p>
            Agences billettistes, réceptives ou tour-opérateurs, physiques ou en ligne : déposez ici,
            entièrement en ligne, la demande de licence de votre nouvelle agence. L'identité du
            représentant légal est vérifiée auprès du RNPP, les pièces justificatives sont jointes au
            dossier, et un numéro de suivi vous permet ensuite de consulter son avancement.
          </p>
        </div>
      </div>
    </section>
  );
}
