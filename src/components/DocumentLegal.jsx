import React from 'react';

/**
 * Un document légal : une suite de sections numérotées.
 *
 * La numérotation est calculée au rendu plutôt qu'écrite dans les titres. Une
 * section peut manquer — celle de l'hébergeur tant qu'il n'est pas connu — et
 * un document dont les numéros sont écrits à la main saute alors un article,
 * ou pire, en renumérote onze à la main le jour où l'on en insère un.
 *
 * Les entrées fausses (`false`, `null`) sont ignorées : c'est ce qui permet
 * d'écrire une section conditionnelle en ligne dans la liste, sans casser la
 * suite des numéros.
 */
export default function DocumentLegal({ sections }) {
  return (
    <>
      {sections.filter(Boolean).map(({ titre, contenu }, index) => (
        <section key={titre} className="doc-legal__section">
          <h2>
            <span className="doc-legal__numero">{index + 1}.</span> {titre}
          </h2>
          {contenu}
        </section>
      ))}
    </>
  );
}
