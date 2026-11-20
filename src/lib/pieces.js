/**
 * Pièces justificatives d'un dossier d'agence de voyage.
 *
 * Les pièces exigées dépendent du régime de l'entreprise. C'est la règle du scénario
 * « Demande de licence d'agence de voyage et de tourisme » (étape 3,
 * « Documents à joindre »).
 *
 * Même règle côté API (app/Enums/DocumentType.php::requises), qui refuse
 * toute pièce non exigée : les deux doivent évoluer ensemble.
 */

/** Libellés et précisions affichés sous chaque zone de dépôt. */
export const PIECES = {
  noteDescriptive: {
    titre: "Note descriptive de l'organisation technique et opérationnelle",
    aide: "Organisation de l'agence : moyens, services proposés, fonctionnement."
  },
  statuts: {
    titre: 'Statuts de la société',
    aide: 'Statuts enregistrés de la société.'
  },
  planRecrutement: {
    titre: 'Plan de recrutement du personnel',
    aide: 'Postes prévus et qualifications professionnelles envisagées.'
  },
  nonFaillite: {
    titre: 'Attestation de non-faillite valide',
    aide: 'Attestation en cours de validité.'
  },
  pieceIdGerant: {
    titre: "Pièce d'identité du gérant",
    aide: "Carte d'identité, passeport ou carte biométrique en cours de validité."
  },
  cvGerant: {
    titre: 'Curriculum vitae du gérant',
    aide: ''
  },
  experiencesGerant: {
    titre: "Attestations d'expérience du gérant",
    aide: 'Une ou plusieurs attestations (certificats de travail, attestations d’emploi…).'
  }
};

/** Pièce à plusieurs fichiers. */
export const PIECES_MULTIPLES = ['experiencesGerant'];

/** Plafond par défaut des attestations d'expérience, tant que l'API ne l'a pas donné. */
export const EXPERIENCES_MAX_DEFAUT = 5;

const PIECES_GERANT = ['pieceIdGerant', 'cvGerant', 'experiencesGerant'];

/**
 * Pièces à téléverser (nouvelle agence), dans l'ordre d'affichage : note
 * descriptive, statuts (hors régime A), plan de recrutement, non-faillite,
 * puis les pièces du gérant.
 *
 * Ni RCCM (repris de l'APIEX), ni casier judiciaire (consulté ou établi
 * auprès du Ministère de la Justice) : ils ne se téléversent pas.
 */
export function piecesRequises({ regime }) {
  return [
    'noteDescriptive',
    ...(regime && regime !== 'A' ? ['statuts'] : []),
    'planRecrutement',
    'nonFaillite',
    ...PIECES_GERANT
  ];
}
