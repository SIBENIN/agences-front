import React from 'react';
import { INSTITUTION, APDP } from '../lib/institution.js';
import DocumentLegal from './DocumentLegal.jsx';

/**
 * Politique de confidentialité.
 *
 * Elle reprend le plan de celle des autres sites de Bénin Tourisme
 * (vodundays.bj) — champ d'application, formalités, données, finalités,
 * conservation, sécurité, droits, plaintes — mais son contenu est celui de
 * cette plateforme, et il en diffère sur l'essentiel : le site source décrit
 * un traitement de prospection, celui-ci instruit des demandes
 * d'autorisation. La finalité n'est donc pas le marketing mais une mission de
 * service public, et les données ne sont pas des coordonnées de visiteurs
 * mais une identité vérifiée auprès de l'ANIP et des
 * pièces justificatives.
 *
 * Les catégories de données et les destinataires énumérés ici décrivent ce que
 * la plateforme collecte et appelle réellement (table `demandes`, pièces
 * jointes, services ANIP, DGI, MJL, encaissement, envois de courriels) : une
 * politique qui promettrait moins que ce que fait le code ne protégerait
 * personne.
 */
export default function Confidentialite() {
  const { editeur, tutelle, adresse, email, site, decret } = INSTITUTION;
  const courriel = <a href={'mailto:' + email}>{email}</a>;

  const sections = [
    {
      titre: 'Responsable du traitement',
      contenu: (
        <>
          <p>
            Les données collectées sur le site <strong>{site}</strong> sont traitées par l’{editeur},
            pour le compte du {tutelle}, en sa qualité de responsable du traitement.
          </p>
          <ul className="infos__liste">
            <li>Siège : {adresse}</li>
            <li>Courriel : {courriel}</li>
          </ul>
        </>
      )
    },

    {
      titre: 'Champ d’application',
      contenu: (
        <p>
          La présente politique s’applique aux traitements mis en œuvre par la plateforme pour recevoir
          et instruire les demandes de licence des agences de voyage et de tourisme. Elle ne s’applique pas aux sites tiers vers lesquels le site renvoie, qui relèvent de
          leurs propres politiques.
        </p>
      )
    },

    {
      titre: 'Cadre légal',
      contenu: (
        <>
          <p>
            Les traitements décrits ici sont soumis à la loi n° 2017-20 du 20 avril 2018 portant code du
            numérique en République du Bénin, notamment son livre cinquième relatif à la protection des
            données à caractère personnel et de la vie privée.
          </p>
          {/* La déclaration à l'APDP ne s'affiche qu'une fois sa référence
              connue : annoncer une formalité accomplie sans pouvoir la citer
              serait une affirmation que le site ne peut pas tenir. */}
          {INSTITUTION.declarationApdp ? (
            <p>
              Le traitement a fait l’objet d’une déclaration auprès de l’{APDP.nom} sous la référence{' '}
              {INSTITUTION.declarationApdp}.
            </p>
          ) : null}
        </>
      )
    },

    {
      titre: 'Données collectées',
      contenu: (
        <>
          <p>
            La plateforme collecte les catégories de données suivantes, selon l’avancement de la
            demande :
          </p>
          <ul className="infos__liste">
            <li>
              <strong>Identité</strong> : numéro personnel d’identification (NPI), nom, prénoms, date de
              naissance, sexe, nationalité.
            </li>
            <li>
              <strong>Coordonnées</strong> : adresse de résidence, numéro de téléphone, adresse
              électronique.
            </li>
            <li>
              <strong>Agence de voyage</strong> : raison sociale, RCCM, nom commercial, téléphone,
              année de démarrage, catégorie, régime, implantation (adresse, coordonnées GPS), site
              internet, adresse postale et situation vis-à-vis de l’administration du tourisme.
            </li>
            <li>
              <strong>Situation fiscale</strong> : numéro d’identification fiscale unique (IFU) de
              l’entreprise, lorsqu’il est renseigné.
            </li>
            <li>
              <strong>Pièces justificatives</strong> : note descriptive, statuts, plan de recrutement,
              attestation de non-faillite, et pour le gérant : pièce d’identité, curriculum vitae et
              attestations d’expérience.
            </li>
            <li>
              <strong>Casier judiciaire</strong> du représentant légal : existence et validité d’un
              bulletin, et le bulletin lui-même, obtenus auprès du Ministère de la Justice.
            </li>
            <li>
              <strong>Paiement</strong> : montant des frais réglés, opérateur, référence de la transaction
              et son état. Aucune donnée bancaire n’est reçue ni conservée par la plateforme.
            </li>
            <li>
              <strong>Engagements</strong> : cases d’engagement acceptées, nom du signataire et date de
              signature.
            </li>
            <li>
              <strong>Suivi du dossier</strong> : numéro de suivi, date de dépôt, décisions et
              changements d’état successifs.
            </li>
          </ul>
        </>
      )
    },

    {
      titre: 'Origine des données',
      contenu: (
        <>
          <p>
            La plupart des données sont fournies par l’usager lui-même lors du remplissage du formulaire.
            D’autres sont obtenues auprès d’administrations, à partir des identifiants qu’il renseigne :
          </p>
          <ul className="infos__liste">
            <li>
              l’identité rattachée au NPI est vérifiée auprès de l’Agence Nationale d’Identification des
              Personnes (ANIP), qui fournit également la photographie du registre ;
            </li>
            <li>
              le numéro IFU est vérifié auprès des services fiscaux ;
            </li>
            <li>
              les entreprises rattachées au NPI sont retrouvées auprès de l’APIEX ;
            </li>
            <li>
              le casier judiciaire est consulté, et au besoin établi, auprès des services du ministère
              de la Justice.
            </li>
          </ul>
          <p>
            Les informations provenant de l’ANIP ne peuvent pas être modifiées sur la plateforme : leur
            rectification s’obtient auprès de l’ANIP, seule habilitée à les corriger.
          </p>
        </>
      )
    },

    {
      titre: 'Finalités et base légale',
      contenu: (
        <>
          <p>
            Les données sont traitées pour l’exécution d’une mission d’intérêt public, dans le cadre du{' '}
            {decret}. Elles servent exclusivement à :
          </p>
          <ul className="infos__liste">
            <li>recenser les agences de voyage et de tourisme exerçant sur le territoire national ;</li>
            <li>
              vérifier l’identité du demandeur, l’authenticité des pièces produites et les conditions
              d’honorabilité exigées par la réglementation ;
            </li>
            <li>instruire la demande et délivrer, le cas échéant, la licence d’exploitation ;</li>
            <li>
              informer le demandeur de l’état de son dossier et lui transmettre la décision et les
              documents qui s’y rapportent ;
            </li>
            <li>
              produire des statistiques sur le secteur, sous une forme qui ne permet pas d’identifier
              les personnes.
            </li>
          </ul>
          <p>
            Les données ne sont utilisées à aucune fin de prospection commerciale, et ne font l’objet
            d’aucune décision entièrement automatisée : l’instruction du dossier revient aux agents
            compétents.
          </p>
        </>
      )
    },

    {
      titre: 'Destinataires',
      contenu: (
        <>
          <p>Les données ne sont accessibles qu’aux destinataires suivants :</p>
          <ul className="infos__liste">
            <li>
              les agents habilités de l’{editeur} et du {tutelle}, chargés de l’instruction des dossiers,
              dans la limite de ce que leurs fonctions exigent ;
            </li>
            <li>
              les administrations sollicitées pour les vérifications décrites ci-dessus, pour le seul
              identifiant nécessaire à la vérification demandée ;
            </li>
            <li>
              les prestataires techniques agissant sur instruction du responsable du traitement :
              hébergement de la plateforme, encaissement des frais (FedaPay), acheminement des courriels
              et des messages courts de notification.
            </li>
          </ul>
          <p>
            Aucune donnée n’est vendue, louée, échangée, ni communiquée à des tiers à des fins
            étrangères à l’instruction des demandes.
          </p>
        </>
      )
    },

    {
      titre: 'Durée de conservation',
      contenu: (
        <>
          <p>
            Les données sont conservées le temps nécessaire à l’instruction de la demande, à la durée de
            validité de la licence délivrée, puis à la tenue du répertoire des agences de voyage et de
            tourisme, sous réserve des obligations légales d’archivage qui s’imposent à
            l’administration.
          </p>
          {/* La durée précise engage l'administration : tant qu'elle n'est pas
              arrêtée, la politique n'énonce que le principe ci-dessus plutôt
              qu'un nombre d'années inventé. */}
          {INSTITUTION.conservation ? (
            <p>Les dossiers sont conservés {INSTITUTION.conservation}.</p>
          ) : null}
          <p>
            Les pièces justificatives sont conservées sur un espace de stockage privé, non accessible
            depuis le site public.
          </p>
        </>
      )
    },

    {
      titre: 'Lieu d’hébergement',
      contenu: (
        <p>
          Les données sont hébergées dans des bases centralisées et ne font l’objet d’aucun transfert
          hors du Bénin, à l’exception des données strictement nécessaires à l’acheminement des
          notifications par courriel et par message court, confiées à des prestataires agissant sur
          instruction du responsable du traitement.
        </p>
      )
    },

    {
      titre: 'Sécurité',
      contenu: (
        <>
          <p>
            Le responsable du traitement met en œuvre les mesures techniques et organisationnelles
            propres à protéger les données contre la perte, la destruction, l’accès non autorisé, la
            divulgation ou la modification accidentelle ou illicite, notamment :
          </p>
          <ul className="infos__liste">
            <li>le chiffrement des échanges entre le navigateur de l’usager et la plateforme ;</li>
            <li>
              le stockage des pièces justificatives sur un espace privé, distinct des fichiers publics du
              site ;
            </li>
            <li>
              l’accès au dossier réservé aux agents habilités, au moyen de comptes nominatifs et de
              droits limités à leurs attributions ;
            </li>
            <li>la journalisation des décisions et des changements d’état des dossiers.</li>
          </ul>
        </>
      )
    },

    {
      titre: 'Cookies et stockage local',
      contenu: (
        <>
          <p>Le site n’utilise aucun cookie publicitaire.</p>
          <p>
            Avec l’accord de l’usager, recueilli par un bandeau à sa première visite, le site mesure sa
            fréquentation au moyen de Google Analytics (Google Ireland Limited) : pages consultées,
            durée de la visite, type d’appareil, pays d’origine. Ces statistiques sont anonymes et ne
            servent qu’à améliorer le site ; elles ne comprennent aucune donnée du dossier, et le numéro
            de suivi est retiré des adresses transmises. Google Analytics dépose des cookies
            (<code>_ga</code>, <code>_ga_*</code>) conservés au plus treize mois, et ses données peuvent
            être traitées hors du Bénin.
          </p>
          <p>
            Sans accord, ou en cas de refus, le script de Google n’est pas chargé et aucun cookie de
            mesure d’audience n’est déposé. Le choix est conservé six mois ; il peut être modifié à tout
            moment par le lien « Gérer les cookies » en pied de page.
          </p>
          <p>
            Pour éviter à l’usager de ressaisir un formulaire long, un brouillon de sa demande est
            enregistré dans son propre navigateur, sur son appareil. Ce brouillon ne comprend pas les
            fichiers qu’il a joints, il n’est transmis à aucun serveur, et il est effacé dès la
            transmission du dossier. Vider les données de navigation du navigateur suffit à le
            supprimer.
          </p>
        </>
      )
    },

    {
      titre: 'Vos droits',
      contenu: (
        <>
          <p>
            Conformément au code du numérique, l’usager dispose sur les données qui le concernent d’un
            droit d’accès, de rectification, d’effacement, de limitation du traitement, de portabilité et
            d’opposition.
          </p>
          <p>
            Ces droits s’exercent auprès du responsable du traitement, à l’adresse {courriel} ou par
            courrier au siège indiqué à l’article 1<sup>er</sup>. La demande, écrite et signée, est
            accompagnée d’une copie d’un titre d’identité et précise l’adresse à laquelle la réponse doit
            être envoyée. Il y est répondu dans les délais prévus par la loi.
          </p>
          <p>
            Deux limites tiennent à la nature du traitement : les données transmises par l’ANIP se
            rectifient auprès de l’ANIP, et l’effacement d’un dossier ne peut être obtenu tant que sa
            conservation est imposée par l’instruction en cours ou par les obligations d’archivage de
            l’administration.
          </p>
        </>
      )
    },

    {
      titre: 'Violation de données',
      contenu: (
        <p>
          En cas de violation de données susceptible de porter atteinte aux droits et libertés des
          personnes concernées, le responsable du traitement en informe l’autorité compétente dès sa
          découverte et, lorsque la violation est susceptible d’engendrer un risque élevé, les personnes
          concernées, dans les conditions prévues par le code du numérique.
        </p>
      )
    },

    {
      titre: 'Réclamation',
      contenu: (
        <>
          <p>
            L’usager qui estime que ses droits ne sont pas respectés peut saisir l’{APDP.nom}, sans
            préjudice d’un recours devant la juridiction compétente :
          </p>
          <ul className="infos__liste">
            <li>{APDP.adresse}</li>
            <li>{APDP.telephone}</li>
            <li>
              <a href={'mailto:' + APDP.email}>{APDP.email}</a>
            </li>
            <li>
              <a href={APDP.site} target="_blank" rel="noreferrer">
                {APDP.site.replace(/^https?:\/\//, '')}
              </a>
            </li>
          </ul>
        </>
      )
    },

    {
      titre: 'Modification de la présente politique',
      contenu: (
        <p>
          La présente politique peut être modifiée pour tenir compte d’une évolution de la
          réglementation ou du dispositif. La version applicable est celle publiée sur le site au moment
          de la consultation.
        </p>
      )
    },

    {
      titre: 'Contact',
      contenu: (
        <p>
          Toute question relative à la présente politique ou à l’exercice des droits reconnus ci-dessus
          peut être adressée à {courriel}.
        </p>
      )
    }
  ];

  return <DocumentLegal sections={sections} />;
}
