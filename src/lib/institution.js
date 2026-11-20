/**
 * Ce que le site dit de lui-même : nom du dispositif et coordonnées. Rassemblé
 * ici parce que ces mentions se répètent d'une page à l'autre, et qu'une
 * coordonnée qui se contredit d'une page à l'autre ne vaut rien.
 *
 * **Les valeurs vides ne s'affichent pas.** Le pied de page omet la ligne dont
 * la donnée manque plutôt que d'imprimer un gabarit à trous : sur un site de
 * l'État, une mention absente vaut mieux qu'une mention supposée. Les champs
 * laissés vides ci-dessous sont ceux que le code ne peut pas connaître — ils
 * demandent une réponse de l'administration.
 */

export const INSTITUTION = {
  /** Le dispositif, tel qu'il se nomme partout ailleurs sur le site. */
  dispositif: 'Recensement des agences de voyage et de tourisme',
  // À CONFIRMER avec l'administration : domaine de publication du formulaire
  // et adresse de contact du dispositif (reprise par le pied de page et la FAQ).
  site: 'agences.benintourisme.bj',

  email: 'contact@benintourisme.bj',

  /** L'éditeur du site, tel qu'il doit être nommé dans les mentions légales. */
  editeur: 'Agence Béninoise pour le Développement du Tourisme (Bénin Tourisme)',
  /** L'autorité de tutelle, pour le compte de laquelle le dispositif est conduit. */
  tutelle: 'Ministère du Tourisme et du Commerce Extérieur',
  /** L'objet du dispositif — cité par les mentions légales et la FAQ. */
  decret: "réglementation de l'exercice de l'activité d'agence de voyage et de tourisme en République du Bénin",

  /**
   * Siège de l'agence, tel que publié sur les autres sites de Bénin Tourisme.
   * Il sert d'adresse de dépôt pour les demandes d'accès et de rectification.
   */
  adresse:
    'Immeuble Sainte Cécile, rue Sylvère Alexandre R.7.15, parcelle D, lot 163, quartier Gbèdomidji, Cotonou, Bénin',

  // --- À renseigner ---------------------------------------------------------
  // Rien de tout cela ne se déduit du code : ces valeurs viennent de
  // l'administration. Tant qu'elles sont vides, les lignes — et, pour
  // l'hébergeur, la section entière — ne sont pas rendues.

  /** Numéro d'assistance, et ses horaires si l'accueil n'est pas continu. */
  telephone: '',
  horaires: '',

  /** Nom et qualité du directeur de la publication. */
  directeurPublication: '',
  /** Raison sociale et adresse de l'hébergeur du site. */
  hebergeur: '',
  /** Référence et date de la déclaration du traitement auprès de l'APDP. */
  declarationApdp: '',
  /**
   * Durée de conservation des dossiers, une fois arrêtée par l'administration
   * (p. ex. « cinq ans à compter de la fin de validité de l'autorisation »).
   * Sans elle, la politique de confidentialité n'énonce que le principe.
   */
  conservation: ''
};

/**
 * L'Autorité de Protection des Données à caractère Personnel : c'est elle
 * qu'un usager saisit s'il estime ses droits méconnus, et ses coordonnées
 * doivent figurer dans la politique de confidentialité.
 */
export const APDP = {
  nom: 'Autorité de Protection des Données à caractère Personnel (APDP)',
  adresse: 'Rue 6.076, Aïdjèdo, immeuble El Marzouk Joël, 01 BP 04837 Cotonou',
  telephone: '+229 21 32 57 88',
  email: 'contact@apdp.bj',
  site: 'https://www.apdp.bj'
};
