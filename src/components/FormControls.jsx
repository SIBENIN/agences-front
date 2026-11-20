import React, { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Bandeau d'état des vérifications (RNPP, DGI, paiement).
 *
 * Ces messages arrivent après coup, sans que rien ne bouge à l'écran là où se
 * trouve le curseur : un lecteur d'écran ne les annoncerait pas. D'où la zone
 * vivante — `alert` quand la vérification a échoué, ce qui interrompt la
 * lecture en cours, `status` sinon, ce qui attend une pause.
 */
export function Status({ status }) {
  if (!status) return null;
  const urgent = status.kind === 'error';
  return (
    <div
      className={'npi-lookup__status npi-lookup__status--' + status.kind}
      role={urgent ? 'alert' : 'status'}
      aria-live={urgent ? 'assertive' : 'polite'}
    >
      {status.kind === 'loading' && <span className="npi-lookup__spinner" aria-hidden="true" />}
      {status.text}
    </div>
  );
}

export function Field({ label, error, span2, required, className = '', children }) {
  return (
    <label className={'form-field' + (span2 ? ' span-2' : '') + (className ? ' ' + className : '')}>
      <span className="form-field__label">
        {label}
        {/* Décoratif : c'est `required` sur le champ qui porte l'information. */}
        {required ? <span className="form-field__required" aria-hidden="true"> *</span> : null}
      </span>
      {children}
      {/* `alert` : l'erreur naît d'une validation, pas d'une frappe — sans
          elle, un lecteur d'écran laisse repartir vers le champ suivant sans
          rien dire. Le message est dans le <label>, donc rattaché au champ. */}
      {error ? <span className="field-error" role="alert">{error}</span> : null}
    </label>
  );
}

/** Choix binaire (Oui / Non), rendu en segments. */
export function Seg({ label, name, value, onChange, options }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((opt) => (
        <label className="seg__option" key={opt}>
          <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)} />
          {opt}
        </label>
      ))}
    </div>
  );
}

/**
 * Infobulle d'aide. Tout est ici — marqueur et bulle — pour ne rien ajouter
 * aux feuilles de style : la bulle est un vrai élément monté à l'ouverture,
 * pas un `::after`, qui ne serait pas stylable en ligne.
 *
 * Le marqueur est un bouton : atteignable au clavier, et `preventDefault`
 * l'empêche de cocher le choix dans le libellé duquel il se trouve.
 */
export function InfoTip({ texte }) {
  const [ouvert, setOuvert] = useState(false);
  // Place de la bulle par rapport au marqueur, calculée à l'ouverture.
  const [place, setPlace] = useState(null);
  const ancreRef = useRef(null);

  // La bulle se centre sur le marqueur, puis se décale ce qu'il faut pour
  // rester dans l'écran. Simplement centrée, celle d'un marqueur proche du
  // bord dépassait de la fenêtre et élargissait toute la page : sur un
  // téléphone, la toucher suffisait à faire défiler le site à l'horizontale.
  useLayoutEffect(() => {
    if (!ouvert || !ancreRef.current) {
      setPlace(null);
      return;
    }
    const MARGE = 8;
    const ancre = ancreRef.current.getBoundingClientRect();
    const ecran = document.documentElement.clientWidth;
    const largeur = Math.min(250, ecran - 2 * MARGE);
    const gauche = Math.max(MARGE, Math.min(ancre.left + ancre.width / 2 - largeur / 2, ecran - MARGE - largeur));
    setPlace({ left: gauche - ancre.left, width: largeur });
  }, [ouvert]);

  if (!texte) return null;

  return (
    <span ref={ancreRef} style={{ position: 'relative', display: 'inline-flex', marginLeft: 6 }}>
      <button
        type="button"
        aria-label={texte}
        onClick={(e) => e.preventDefault()}
        onMouseEnter={() => setOuvert(true)}
        onMouseLeave={() => setOuvert(false)}
        onFocus={() => setOuvert(true)}
        onBlur={() => setOuvert(false)}
        // Le bouton déborde de 12 px autour de la pastille, et une marge
        // négative l'annule dans la mise en page : la pastille garde ses
        // 16 px à l'œil, le doigt en trouve 40. Sur un téléphone, viser 16 px
        // revenait une fois sur deux à cocher le choix voisin.
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          margin: -12,
          padding: 0,
          border: 'none',
          background: 'none',
          cursor: 'help',
          flex: 'none'
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            border: '1px solid var(--color-border-input)',
            borderRadius: '50%',
            background: 'var(--color-input-bg)',
            color: 'var(--color-text-soft)',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1
          }}
        >
          i
        </span>
      </button>
      {ouvert && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            // Tant que la place n'est pas calculée — avant le premier
            // affichage —, la bulle est montée sans largeur ni visibilité :
            // elle ne peut alors rien élargir.
            left: place ? place.left : 0,
            width: place ? place.width : 0,
            visibility: place ? 'visible' : 'hidden',
            boxSizing: 'border-box',
            zIndex: 30,
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-text)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.45,
            textAlign: 'left',
            whiteSpace: 'normal',
            pointerEvents: 'none'
          }}
        >
          {texte}
        </span>
      )}
    </span>
  );
}

/**
 * `infos` (facultatif) : texte d'aide par libellé — une infobulle apparaît à
 * côté des choix qui en ont un, les autres restent tels quels.
 */
export function ChipList({ group, options, selected, onToggle, infos }) {
  return (
    <div className="chip-list" data-group={group}>
      {options.map((opt) => (
        <label className="chip" key={opt}>
          <input type="checkbox" className="chip-checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} />
          {opt}
          {infos ? <InfoTip texte={infos[opt]} /> : null}
        </label>
      ))}
    </div>
  );
}

const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Libellés du champ, à passer quand il ne porte pas sur des communes. Ils sont
 * groupés plutôt qu'éparpillés en quatre props : les quatre parlent de la même
 * chose, et en oublier un donnerait un champ qui invite à « rechercher une
 * commune » au milieu des sites touristiques.
 */
export const LIBELLES_COMMUNES = {
  recherche: 'Rechercher une commune…',
  ajout: 'Ajouter une commune…',
  deplier: 'Afficher les communes',
  vide: 'Aucune commune trouvée.'
};

/**
 * Multi-sélection avec recherche : les choix retenus s'affichent en étiquettes
 * dans le champ, les autres se prennent dans la liste déroulante.
 *
 * Deux formes de liste, au choix :
 *
 * - `options` — une liste simple (communes d'intervention) ;
 * - `groups` — des listes intitulées, `[[titre, options], …]` (sites
 *   touristiques, rangés par commune). L'intitulé ne se sélectionne pas : il
 *   situe les choix, et sans lui deux sites homonymes de communes différentes
 *   seraient impossibles à distinguer.
 */
export function MultiSelect({ options, groups, selected, onToggle, libelles = LIBELLES_COMMUNES }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    function onDocClick(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // Une liste simple est un groupe sans intitulé : le rendu n'a ainsi qu'un
  // seul cas à traiter. Un groupe que la recherche vide disparaît, en-tête
  // comprise — une commune sans site correspondant n'a rien à annoncer.
  const q = normalize(query.trim());
  const sections = (groups ?? [[null, options ?? []]])
    .map(([titre, liste]) => [titre, liste.filter((opt) => !q || normalize(opt).includes(q))])
    .filter(([, liste]) => liste.length > 0);

  return (
    <div className="ms" ref={rootRef}>
      <div
        className="ms__control"
        onClick={(e) => {
          if (e.target === searchRef.current) return;
          setOpen(true);
          searchRef.current?.focus();
        }}
      >
        <div className="ms__tags">
          {selected.map((value) => (
            <span className="ms__tag" key={value}>
              <span>{value}</span>
              <button
                type="button"
                className="ms__tag-remove"
                aria-label={'Retirer ' + value}
                onClick={(e) => { e.stopPropagation(); onToggle(value); }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          className="ms__search"
          ref={searchRef}
          placeholder={selected.length ? libelles.ajout : libelles.recherche}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); e.target.blur(); } }}
        />
        <button
          type="button"
          className="ms__toggle"
          aria-label={libelles.deplier}
          onClick={(e) => { e.stopPropagation(); setOpen((v) => { if (!v) searchRef.current?.focus(); return !v; }); }}
        >
          ▾
        </button>
      </div>
      {open && (
        <div className="ms__panel">
          <div className="ms__options">
            {sections.map(([titre, liste]) => (
              <Fragment key={titre ?? '__sans-titre'}>
                {titre && <span className="ms__group">{titre}</span>}
                {liste.map((opt) => {
                  const isSelected = selected.includes(opt);
                  return (
                    <label className={'ms__option' + (isSelected ? ' is-selected' : '')} key={opt}>
                      <input type="checkbox" className="chip-checkbox" checked={isSelected} onChange={() => onToggle(opt)} />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </Fragment>
            ))}
          </div>
          {sections.length === 0 && <p className="ms__empty">{libelles.vide}</p>}
        </div>
      )}
    </div>
  );
}

const FORMATS_ACCEPTES = /\.(pdf|jpe?g|png|webp)$/i;
const TAILLE_MAX = 5 * 1024 * 1024; // REGISTRE_DOCUMENTS_MAX_KB côté API

/**
 * Zone de dépôt multi-fichiers : glisser-déposer ou clic pour parcourir.
 *
 * `max` vient de l'API (`justificatifsMax`) : relever le plafond se fait dans
 * le `.env`, sans toucher au formulaire. Au-delà, les fichiers en trop sont
 * écartés et le visiteur est prévenu.
 *
 * `files` est la liste des File retenus ; `onChange` reçoit la nouvelle liste.
 */
export function Dropzone({ id, files, onChange, max = 2, disabled = false, invalid = false }) {
  const [survol, setSurvol] = useState(false);
  const [alerte, setAlerte] = useState('');
  const plein = files.length >= max;

  function ajouter(liste) {
    const candidats = Array.from(liste || []);
    const refus = [];
    const valides = candidats.filter((f) => {
      if (!FORMATS_ACCEPTES.test(f.name)) { refus.push(`${f.name} : format non accepté`); return false; }
      if (f.size > TAILLE_MAX) { refus.push(`${f.name} : plus de 5 Mo`); return false; }
      // Le même fichier choisi deux fois n'est gardé qu'une fois.
      return !files.some((g) => g.name === f.name && g.size === f.size);
    });
    const place = Math.max(0, max - files.length);
    if (valides.length > place) refus.push(`${max} fichier${max > 1 ? 's' : ''} au maximum`);
    setAlerte(refus.join(' · '));
    if (valides.length && place) onChange([...files, ...valides.slice(0, place)]);
  }

  function retirer(index) {
    setAlerte('');
    onChange(files.filter((_, i) => i !== index));
  }

  const inactif = disabled || plein;

  return (
    <div className="dropzone-wrap">
      <label
        htmlFor={id}
        className={'dropzone' + (survol ? ' is-over' : '') + (inactif ? ' is-disabled' : '') + (invalid ? ' is-invalid' : '')}
        onDragOver={(e) => { e.preventDefault(); if (!inactif) setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          if (!inactif) ajouter(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          id={id}
          multiple
          accept="image/*,.pdf"
          disabled={inactif}
          onChange={(e) => { ajouter(e.target.files); e.target.value = ''; }}
        />
        <span className="dropzone__icon" aria-hidden="true">⇪</span>
        <span className="dropzone__text">
          {plein
            ? 'Nombre maximal de fichiers atteint'
            : <>Glissez vos fichiers ici ou <strong>parcourez</strong></>}
        </span>
        <span className="dropzone__hint">
          PDF, JPG, PNG ou WEBP · 5 Mo max · {files.length}/{max} fichier{max > 1 ? 's' : ''}
        </span>
      </label>

      {files.length > 0 && (
        <ul className="dropzone__files">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}-${i}`}>
              <span className="dropzone__file-name">✓ {f.name}</span>
              {!disabled && (
                <button type="button" className="dropzone__remove" onClick={() => retirer(i)} aria-label={`Retirer ${f.name}`}>
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {alerte && <span className="field-hint field-hint--error" role="alert">{alerte}</span>}
    </div>
  );
}

/** Le File retenu est celui envoyé à l'API après création du dossier. */
export function UploadButton({ id, file, onPick, solid, label = 'Téléverser' }) {
  return (
    <label className={'upload-btn' + (solid ? ' upload-btn--solid' : '')}>
      <input
        type="file"
        id={id}
        accept="image/*,.pdf"
        onChange={(e) => {
          const picked = e.target.files && e.target.files[0];
          if (picked) onPick(picked);
        }}
      />
      <span>{file ? '✓ ' + file.name : label}</span>
    </label>
  );
}
