import React, { useEffect, useId, useState } from 'react';
import { INSTITUTION } from '../lib/institution.js';

/**
 * Les questions fréquentes du dispositif, et l'accordéon qui les présente.
 *
 * Le texte vient de l'administration : il répond aux questions que le guichet
 * reçoit le plus souvent — qui peut déposer, ce que coûte la démarche, ce
 * qu'il advient du dossier une fois transmis. Il est rassemblé ici, et non
 * dans `InfosPage`, pour deux raisons : ces réponses sont susceptibles d'être
 * reprises ailleurs (bandeau d'accueil, courriel d'accusé de réception), et
 * une réponse qui se contredit d'un endroit à l'autre du site vaut moins que
 * pas de réponse du tout.
 *
 * Les coordonnées et les liens ne sont pas écrits en dur dans les réponses :
 * l'adresse de contact vient de `lib/institution.js`, comme dans le pied de
 * page, et le suivi pointe vers `/?suivi=` — la forme qui s'ouvre quel que
 * soit l'hébergement, sans règle de réécriture.
 */

/** Le lien de suivi, tel qu'il figure déjà dans le bandeau et le pied de page. */
const LIEN_SUIVI = '/?suivi=';

/** L'adresse de contact, en lien cliquable — elle revient dans trois réponses. */
function LienContact() {
  return <a href={'mailto:' + INSTITUTION.email}>{INSTITUTION.email}</a>;
}

/**
 * Une entrée par question. `reponse` est le texte affiché ; `reponseTexte` sa
 * version en chaîne, pour les données structurées — un moteur de recherche ne
 * sait pas lire du JSX, et deux textes qui divergeraient donneraient à la
 * fiche affichée dans les résultats un contenu que la page ne porte pas.
 */
export const QUESTIONS_FREQUENTES = [
  {
    id: 'qui-peut-demander',
    question: 'Qui peut effectuer une demande ?',
    reponseTexte:
      'Toute entreprise exerçant ou souhaitant exercer l’activité d’agence de voyage et de tourisme au Bénin : agence billettiste, réceptive ou tour-opérateur, physique ou en ligne. La demande est faite par le représentant légal (ou promoteur) de l’agence.',
    reponse: <p>{'Toute entreprise exerçant ou souhaitant exercer l’activité d’agence de voyage et de tourisme au Bénin : agence billettiste, réceptive ou tour-opérateur, physique ou en ligne. La demande est faite par le représentant légal (ou promoteur) de l’agence.'}</p>
  },
  {
    id: 'npi',
    question: 'Pourquoi mon NPI est-il demandé ?',
    reponseTexte:
      'L’identité du représentant légal est vérifiée auprès du Registre National des Personnes Physiques (ANIP) à partir de son NPI. Un code de confirmation est envoyé par SMS au numéro rattaché à ce NPI.',
    reponse: <p>{'L’identité du représentant légal est vérifiée auprès du Registre National des Personnes Physiques (ANIP) à partir de son NPI. Un code de confirmation est envoyé par SMS au numéro rattaché à ce NPI.'}</p>
  },
  {
    id: 'pieces',
    question: 'Quelles pièces dois-je fournir ?',
    reponseTexte:
      'Note descriptive de l’organisation de l’agence, plan de recrutement, attestation de non-faillite, statuts de la société (sauf au régime A), pièce d’identité, CV et attestations d’expérience du gérant. Le RCCM est repris de l’APIEX et le casier judiciaire est consulté auprès du Ministère de la Justice : vous n’avez pas à les fournir. Formats acceptés : PDF, JPG, PNG ou WEBP, 5 Mo maximum par fichier.',
    reponse: <p>{'Note descriptive de l’organisation de l’agence, plan de recrutement, attestation de non-faillite, statuts de la société (sauf au régime A), pièce d’identité, CV et attestations d’expérience du gérant. Le RCCM est repris de l’APIEX et le casier judiciaire est consulté auprès du Ministère de la Justice : vous n’avez pas à les fournir. Formats acceptés : PDF, JPG, PNG ou WEBP, 5 Mo maximum par fichier.'}</p>
  },
  {
    id: 'frais',
    question: 'Combien coûte la demande ?',
    reponseTexte:
      'Les frais de dossier sont de 100 000 FCFA, réglés en ligne au récapitulatif (Mobile Money ou carte bancaire). Si le Ministère de la Justice ne détient aucun casier judiciaire en cours de validité à votre nom, 1 900 FCFA s’ajoutent pour le faire établir.',
    reponse: <p>{'Les frais de dossier sont de 100 000 FCFA, réglés en ligne au récapitulatif (Mobile Money ou carte bancaire). Si le Ministère de la Justice ne détient aucun casier judiciaire en cours de validité à votre nom, 1 900 FCFA s’ajoutent pour le faire établir.'}</p>
  },
  {
    id: 'apres-depot',
    question: 'Que se passe-t-il après le dépôt ?',
    reponseTexte:
      'Vous recevez par email un récapitulatif et un numéro de suivi. Votre dossier n’est déclaré reçu qu’après examen de la conformité des pièces par les services de l’administration du tourisme. Vous êtes informé(e) par email de chaque décision.',
    reponse: <p>{'Vous recevez par email un récapitulatif et un numéro de suivi. Votre dossier n’est déclaré reçu qu’après examen de la conformité des pièces par les services de l’administration du tourisme. Vous êtes informé(e) par email de chaque décision.'}</p>
  },
  {
    id: 'pre-enregistre',
    question: 'Mon dossier est « pré-enregistré » : qu’est-ce que cela signifie ?',
    reponseTexte:
      'Votre dossier a été examiné et jugé conforme. Il attend la décision finale (autorisation ou refus), qui vous sera notifiée par email et affichée sur la page de suivi.',
    reponse: <p>{'Votre dossier a été examiné et jugé conforme. Il attend la décision finale (autorisation ou refus), qui vous sera notifiée par email et affichée sur la page de suivi.'}</p>
  },
  {
    id: 'suivi',
    question: 'Comment suivre mon dossier ?',
    reponseTexte:
      'Depuis la page « Suivre mon dossier », à l’aide du numéro de suivi reçu au dépôt (forme AV-26-0000AAAA).',
    reponse: (
      <p>
        Depuis la page <a href={LIEN_SUIVI}>« Suivre mon dossier »</a>, à l’aide du numéro de suivi
        reçu au dépôt (forme AV-26-0000AAAA).
      </p>
    )
  },
  {
    id: 'plusieurs',
    question: 'Puis-je déposer une nouvelle demande pendant qu’une autre est en cours ?',
    reponseTexte:
      'Non : tant qu’une demande est en cours de traitement pour une entreprise (même RCCM), une nouvelle demande ne peut pas être déposée.',
    reponse: <p>{'Non : tant qu’une demande est en cours de traitement pour une entreprise (même RCCM), une nouvelle demande ne peut pas être déposée.'}</p>
  }
];

/**
 * Données structurées `FAQPage` : elles donnent aux moteurs de recherche les
 * questions et leurs réponses, de sorte qu'un usager qui cherche « casier
 * judiciaire guide Bénin » tombe sur la bonne réponse plutôt que sur la page
 * d'accueil. Le script est retiré au démontage — sans quoi il resterait
 * attaché au document en revenant à l'accueil, qui n'est pas une FAQ.
 */
function useDonneesStructurees() {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: QUESTIONS_FREQUENTES.map(({ question, reponseTexte }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: reponseTexte }
      }))
    });
    document.head.appendChild(script);

    return () => script.remove();
  }, []);
}

/**
 * Une question et sa réponse.
 *
 * L'accordéon est piloté en React plutôt que confié à `<details>` : le contenu
 * replié d'un `<details>` ne s'imprime pas, et ces pages sont parfois
 * imprimées pour être versées à un dossier. Ici la réponse reste dans le
 * document — masquée par une classe, que la feuille d'impression annule.
 */
function Question({ entree, ouverte, onBascule }) {
  const idReponse = useId();

  return (
    <li className={'faq__item' + (ouverte ? ' faq__item--ouvert' : '')}>
      {/* `<h2>` autour du bouton : la liste des questions est la table des
          matières de la page, et c'est par elle qu'un lecteur d'écran la
          parcourt. Le bouton reste l'élément cliquable. */}
      <h2 className="faq__question">
        <button
          type="button"
          className="faq__bouton"
          aria-expanded={ouverte}
          aria-controls={idReponse}
          onClick={onBascule}
        >
          <span className="faq__intitule">{entree.question}</span>
          <span className="faq__chevron" aria-hidden="true"></span>
        </button>
      </h2>
      {/* Pas de `role="region"` sur le pli : douze régions nommées noient les
          repères de navigation d'un lecteur d'écran, là où le couple
          `aria-expanded` / `aria-controls` du bouton suffit à annoncer l'état
          et à mener à la réponse. */}
      {/* Trois couches, et chacune sert : la grille qui s'anime, le masque qui
          coupe le contenu pendant qu'elle se referme, et le bloc qui porte les
          marges — celles-ci ne peuvent pas vivre sur le masque, dont la
          hauteur doit pouvoir tomber à zéro. */}
      <div id={idReponse} className={'faq__reponse' + (ouverte ? '' : ' faq__reponse--repliee')}>
        <div className="faq__reponse-corps">
          <div className="faq__reponse-texte">{entree.reponse}</div>
        </div>
      </div>
    </li>
  );
}

/**
 * La liste complète.
 *
 * Une seule réponse est ouverte à la fois : ouvrir une question referme la
 * précédente. La liste garde ainsi sa hauteur, et l'intitulé qu'on vient de
 * cliquer ne s'échappe pas vers le haut de l'écran pendant qu'on lit.
 */
export default function Faq() {
  const [ouverte, setOuverte] = useState(null);
  useDonneesStructurees();

  // Recliquer sur la question ouverte la referme : sans cela, une fois la
  // première ouverte, la liste ne peut plus revenir à son état de départ.
  const basculer = (id) => setOuverte((precedente) => (precedente === id ? null : id));

  return (
    <div className="faq">
      <p className="faq__chapeau">
        Les réponses aux questions le plus souvent posées sur le recensement. Vous ne trouvez pas la
        vôtre ? Écrivez-nous à <LienContact />.
      </p>

      <ul className="faq__liste">
        {QUESTIONS_FREQUENTES.map((entree) => (
          <Question
            key={entree.id}
            entree={entree}
            ouverte={ouverte === entree.id}
            onBascule={() => basculer(entree.id)}
          />
        ))}
      </ul>
    </div>
  );
}
