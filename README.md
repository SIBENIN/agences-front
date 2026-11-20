# Formulaire public — Recensement des agences de voyage

Application React (Vite) du dépôt en ligne des demandes de licence d'agence de voyage. Elle consomme l'API [`../agences-api`](../agences-api).

```bash
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:8000/api
npm run dev              # http://localhost:5173
npm run build            # dist/
```

## Parcours (5 étapes)

1. **Représentant légal** — NPI vérifié au RNPP (code SMS), identité et photo préremplies ; email.
2. **Informations sur l'agence** — entreprises rattachées au NPI retrouvées à l'APIEX
   (une seule : remplie d'office ; plusieurs : liste de choix ; aucune : saisie), puis raison sociale, RCCM, IFU (vérification DGI), nom commercial, téléphone de l'agence,
   année de démarrage, catégorie, régime (+ précision si « Autres »).
3. **Implantation** — physique (département → commune, arrondissement, quartier, carré, lot,
   indication géographique obligatoire, GPS facultatif avec « utiliser ma position ») ou en ligne (site obligatoire) ;
   adresse postale.
4. **Pièces et casier judiciaire** — seules les pièces exigées s'affichent (`src/lib/pieces.js`,
   même règle que l'API) ; le casier du représentant est consulté au Ministère de la Justice.
5. **Engagement et envoi** — récapitulatif, engagements, puis paiement FedaPay des frais
   (100 000 FCFA, + 1 900 FCFA si aucun casier valide) et dépôt automatique une fois payé.

Le brouillon (hors fichiers) est conservé dans le navigateur. Après l'envoi : numéro de
suivi `AV-26-XXXXXXXX`, accusé de réception par email.

**Suivi** : `/?suivi=AV-…` — statut, observations de l'administration, numéro de licence ;
ajout des pièces manquantes d'un dossier en instruction après un code envoyé à
l'email du dossier.

À confirmer avant mise en ligne : domaine et adresse de contact dans
`src/lib/institution.js`, `index.html`, `public/sitemap.xml` ; identifiant Google Analytics
propre au site dans `.env.production` (vide par défaut).
