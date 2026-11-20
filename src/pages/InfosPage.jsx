import React, { useEffect } from 'react';
import { INSTITUTION } from '../lib/institution.js';
import Faq from '../components/Faq.jsx';
import MentionsLegales from '../components/MentionsLegales.jsx';
import Confidentialite from '../components/Confidentialite.jsx';

/**
 * Les pages d'information du site : mentions légales, politique de
 * confidentialité, questions fréquentes.
 *
 * L'audit du 20 août 2026 (constats C-01, C-04, E-01, E-02) relevait
 * qu'aucune de ces pages n'existait ; les trois ont depuis reçu leur texte,
 * chacune dans son composant.
 *
 * Ce qui ne se déduit ni du code ni des textes publiés — hébergeur, directeur
 * de la publication, durée de conservation — vit dans `lib/institution.js`,
 * et les mentions correspondantes ne paraissent qu'une fois renseignées : une
 * page de l'État ne peut pas porter un contenu supposé.
 *
 * Aucune de ces pages ne dépend des référentiels ni de l'API : elles doivent
 * rester consultables quand les inscriptions sont closes, ou quand le service
 * est indisponible. C'est même là qu'on cherche une adresse de contact.
 */

/**
 * Lecture et écriture des balises du `<head>`. Elles existent déjà dans
 * `index.html` : on les modifie plutôt que d'en ajouter, sans quoi une page
 * porterait deux titres concurrents.
 */
const lireMeta = (attribut, nom) =>
  document.head.querySelector('meta[' + attribut + '="' + nom + '"]')?.getAttribute('content') || '';

function ecrireMeta(attribut, nom, valeur) {
  const balise = document.head.querySelector('meta[' + attribut + '="' + nom + '"]');
  if (balise) balise.setAttribute('content', valeur);
}

const lireCanonique = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';

function ecrireCanonique(href) {
  const balise = document.head.querySelector('link[rel="canonical"]');
  if (balise) balise.setAttribute('href', href);
}

/**
 * Les trois documents, par identifiant d'adresse (`?page=…`).
 *
 * `Corps` rend le contenu de la page. Chacun vit dans son propre composant :
 * ces textes sont longs, ils se relisent seuls, et l'un d'eux (la FAQ) porte
 * en plus un comportement. La feuille `styles/infos.css` met en forme les
 * `<h2>`, les `<p>` et les `<ul className="infos__liste">` qu'ils produisent.
 */
export const PAGES_INFOS = {
  'mentions-legales': {
    titre: 'Mentions légales',
    Corps: MentionsLegales
  },
  confidentialite: {
    titre: 'Politique de confidentialité',
    Corps: Confidentialite
  },
  faq: {
    titre: 'Questions fréquentes',
    Corps: Faq
  }
};

export default function InfosPage({ page }) {
  const document_ = PAGES_INFOS[page] || PAGES_INFOS['mentions-legales'];
  const { titre, Corps } = document_;

  // Titre d'onglet et adresse canonique sont posés ici : l'application n'a pas
  // de routeur qui s'en charge, et les trois documents partageraient sinon le
  // titre et la canonique de la page d'accueil — impossibles à distinguer dans
  // un historique, et déclarés à un moteur de recherche comme une seule page.
  useEffect(() => {
    const precedents = {
      titre: document.title,
      ogTitre: lireMeta('property', 'og:title'),
      canonique: lireCanonique()
    };

    document.title = titre + ' — ' + INSTITUTION.dispositif;
    ecrireMeta('property', 'og:title', titre + ' — ' + INSTITUTION.dispositif);
    ecrireCanonique('https://' + INSTITUTION.site + '/?page=' + page);
    window.scrollTo(0, 0);

    return () => {
      document.title = precedents.titre;
      ecrireMeta('property', 'og:title', precedents.ogTitre);
      ecrireCanonique(precedents.canonique);
    };
  }, [page, titre]);

  return (
    <main className="page-main infos" id="contenu">
      {/* Le retour est sur sa propre ligne : accolé au nom du dispositif, on
          lisait « ← Retour à l'accueil Registre National des Guides » d'un
          seul tenant. */}
      <header className="infos__entete">
        <a className="infos__retour" href="/">
          <span className="infos__retour-fleche" aria-hidden="true">←</span>
          Retour à l’accueil
        </a>
        <p className="infos__eyebrow">{INSTITUTION.dispositif}</p>
        <h1 className="infos__titre">{titre}</h1>
      </header>

      <div className="infos__corps">
        <Corps />
      </div>
    </main>
  );
}
