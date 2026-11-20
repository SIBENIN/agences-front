import React from 'react';
import { INSTITUTION } from '../lib/institution.js';
import DocumentLegal from './DocumentLegal.jsx';

/**
 * Mentions légales du site.
 *
 * Le texte suit celui des autres sites de Bénin Tourisme (vodundays.bj) —
 * même éditeur, même droit applicable — mais il est adapté à ce que fait
 * réellement cette plateforme : elle ne promeut pas une destination, elle
 * reçoit des dossiers administratifs. Les sections propres à un site vitrine
 * (publicité, téléchargements, indemnisation) ont cédé la place à ce qu'un
 * usager doit savoir avant de déposer : ce à quoi l'engage sa déclaration, ce
 * qui reste gratuit, et ce que l'administration ne garantit pas.
 *
 * Ce qui manque encore — directeur de la publication, hébergeur — n'est pas
 * inventé : ces valeurs vivent dans `lib/institution.js`, et les lignes
 * correspondantes ne paraissent qu'une fois renseignées. Une mention légale
 * supposée vaut moins qu'une mention absente.
 */
export default function MentionsLegales() {
  const { editeur, tutelle, adresse, email, telephone, site, decret } = INSTITUTION;
  const courriel = <a href={'mailto:' + email}>{email}</a>;

  const sections = [
    {
      titre: 'Éditeur du site',
      contenu: (
        <>
          <p>
            Le site <strong>{site}</strong> est édité par l’{editeur}, pour le compte du {tutelle}.
          </p>
          <ul className="infos__liste">
            <li>Siège : {adresse}</li>
            <li>Courriel : {courriel}</li>
            {telephone ? <li>Téléphone : {telephone}</li> : null}
            {INSTITUTION.directeurPublication ? (
              <li>Directeur de la publication : {INSTITUTION.directeurPublication}</li>
            ) : null}
          </ul>
        </>
      )
    },

    // Section entière conditionnelle : l'hébergeur est une information que
    // l'usager doit pouvoir vérifier, elle ne se devine pas depuis le code.
    INSTITUTION.hebergeur && {
      titre: 'Hébergement',
      contenu: <p>Le site est hébergé par {INSTITUTION.hebergeur}.</p>
    },

    {
      titre: 'Objet du site',
      contenu: (
        <>
          <p>
            Le site {site} est la plateforme de recensement en ligne des agences de voyage et de
            tourisme : demandes de licence des nouvelles agences, dans le cadre de
            la {decret}.
          </p>
          <p>
            Il s’adresse aux entreprises exerçant ou souhaitant exercer l’activité d’agence de voyage
            au Bénin, par l’intermédiaire de leur représentant légal. Il permet de constituer un dossier, de le transmettre aux services compétents et d’en suivre
            l’état au moyen du numéro de suivi délivré lors du dépôt.
          </p>
          <p>
            Le dépôt de la demande sur la plateforme est gratuit.
          </p>
        </>
      )
    },

    {
      titre: 'Acceptation des présentes mentions',
      contenu: (
        <>
          <p>
            L’accès au site et l’utilisation de ses services valent acceptation des présentes mentions
            légales. L’usager qui ne les accepte pas est invité à renoncer à l’usage du site.
          </p>
          <p>
            L’éditeur peut les modifier à tout moment, notamment pour tenir compte d’une évolution de la
            réglementation ou du dispositif. Les conditions applicables sont celles publiées sur le site
            au moment de la consultation.
          </p>
        </>
      )
    },

    {
      titre: 'Accès au service',
      contenu: (
        <>
          <p>
            Le site est accessible gratuitement à tout usager disposant d’un accès à internet. Les frais
            d’accès — connexion, équipement, communications — restent à sa charge.
          </p>
          <p>
            L’éditeur s’efforce d’assurer la disponibilité du service sans pouvoir la garantir : l’accès
            peut être interrompu, notamment pour maintenance, mise à jour ou en cas de force majeure. La
            période de dépôt des demandes est par ailleurs fixée par l’administration ; hors de cette
            période, le formulaire n’est pas accessible.
          </p>
        </>
      )
    },

    {
      titre: 'Obligations de l’usager',
      contenu: (
        <>
          <p>
            L’usager s’engage à ne déclarer que des informations exactes, à ne joindre que des pièces
            authentiques, et à ne déposer une demande que pour lui-même ou pour une personne qui l’a
            expressément mandaté. Toute déclaration inexacte ou toute pièce falsifiée expose son auteur
            au rejet de sa demande, au retrait de l’autorisation délivrée et, le cas échéant, aux
            poursuites prévues par la loi.
          </p>
          <p>
            L’usager s’interdit toute action de nature à perturber le fonctionnement du site ou des
            serveurs qui le servent, toute tentative d’accès non autorisé, et tout usage des données
            d’autrui.
          </p>
        </>
      )
    },

    {
      titre: 'Propriété intellectuelle',
      contenu: (
        <>
          <p>
            L’ensemble des éléments du site — textes, formulaires, photographies, graphismes, logotypes,
            marques, base de données et développements informatiques — est protégé par la législation
            relative à la propriété intellectuelle. Ces éléments demeurent la propriété de l’{editeur} ou
            de leurs titulaires respectifs.
          </p>
          <p>
            Toute reproduction, représentation, adaptation ou diffusion, totale ou partielle et sur
            quelque support que ce soit, est interdite sans autorisation écrite préalable, sous réserve
            des exceptions prévues par la loi. Les documents déposés par l’usager demeurent les siens ;
            leur traitement est décrit dans la{' '}
            <a href="?page=confidentialite">politique de confidentialité</a>.
          </p>
        </>
      )
    },

    {
      titre: 'Données à caractère personnel',
      contenu: (
        <p>
          Le dépôt d’une demande implique la collecte de données à caractère personnel. Leur traitement
          est régi par la loi n° 2017-20 du 20 avril 2018 portant code du numérique en République du
          Bénin, et détaillé dans la <a href="?page=confidentialite">politique de confidentialité</a>,
          qui précise les données collectées, leurs destinataires et les droits reconnus à l’usager.
        </p>
      )
    },

    {
      titre: 'Services tiers et liens externes',
      contenu: (
        <p>
          Le site s’appuie sur des services fournis par d’autres administrations et par des prestataires
          — vérification d’identité, vérification de l’IFU, envoi des notifications. Il renvoie également vers des sites tiers, notamment institutionnels. L’éditeur
          n’exerce aucun contrôle sur le contenu de ces sites et ne saurait en répondre.
        </p>
      )
    },

    {
      titre: 'Exactitude des informations et responsabilité',
      contenu: (
        <>
          <p>
            L’éditeur apporte le plus grand soin aux informations publiées et les met à jour
            régulièrement, sans pouvoir garantir qu’elles soient à tout moment exhaustives ou exemptes
            d’erreur. Toute inexactitude constatée peut être signalée à l’adresse {courriel}.
          </p>
          <p>
            La publication d’une information sur le site ne vaut pas décision : seule la décision
            notifiée à l’issue de l’instruction du dossier fait foi. L’éditeur ne saurait être tenu
            responsable des conséquences d’une interruption du service, d’une erreur de saisie commise
            par l’usager, ou de l’usage fait des informations publiées.
          </p>
        </>
      )
    },

    {
      titre: 'Droit applicable',
      contenu: (
        <p>
          Les présentes mentions sont régies par le droit béninois. Tout différend relatif à leur
          interprétation ou à leur exécution relève de la compétence des juridictions béninoises.
        </p>
      )
    },

    {
      titre: 'Contact',
      contenu: (
        <p>
          Toute question relative au site ou à une demande en cours peut être adressée à {courriel}, ou
          par courrier au siège de l’éditeur indiqué à l’article 1<sup>er</sup>.
        </p>
      )
    }
  ];

  return <DocumentLegal sections={sections} />;
}
