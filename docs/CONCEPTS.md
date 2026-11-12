# Concepts clés (fiche d'entrevue)

Chaque notion est reliée au code de `src/ui-gauge.ts`.

## 1. Custom Elements : créer ses propres balises

Un Custom Element est une classe qui hérite de `HTMLElement`, enregistrée sous un nom de balise :

```ts
customElements.define('ui-gauge', UiGauge); // ce que fait @customElement('ui-gauge')
```

- **Le nom doit contenir un tiret** (`ui-gauge`) : c'est ce qui le distingue des balises natives présentes et futures.
- **Mise à niveau (« upgrade »)** : le navigateur peut lire `<ui-gauge>` avant que le JavaScript soit chargé ; la balise
  reste un élément inconnu, puis devient une vraie `UiGauge` au moment du `define`.
- **Cycle de vie natif** : `constructor` → `connectedCallback` (ajouté au document) → `attributeChangedCallback`
  (attribut observé modifié, liste dans `static observedAttributes`) → `disconnectedCallback` (retiré).
  Lit s'appuie sur ces rappels ; on n'a presque jamais à les écrire soi-même.
- **Indépendant des frameworks** : `<ui-gauge>` marche en HTML pur, dans React, Angular ou Vue, car c'est un élément du DOM.
  Démonstration : `index.html` le pilote avec `document.getElementById(...).value = 80`.
- **TypeScript** : `HTMLElementTagNameMap` (fin du fichier) fait que `document.querySelector('ui-gauge')` est typé `UiGauge`.

## 2. Shadow DOM : l'encapsulation

Lit attache une **racine d'ombre** (`this.shadowRoot`, mode `open`) et y dessine le gabarit.

- **Styles isolés dans les deux sens** : le CSS de la page n'entre pas (un `.label` de la page ne touche pas notre `.label`),
  et `static styles` ne sort pas. Pas besoin de BEM ni de CSS Modules.
- **`:host`** stylise l'élément lui-même depuis l'intérieur (`display: inline-block`, taille…).
- **Ce qui traverse la frontière, volontairement** :
  - les **propriétés héritées** (`color`, `font-family`) ;
  - les **variables CSS** : `--ui-gauge-color-critical` posée sur la page est lue à l'intérieur. C'est l'API de thème.
    Astuce du code : chaque variable publique est recopiée dans une variable privée avec sa valeur par défaut
    (`--_critical: var(--ui-gauge-color-critical, light-dark(...))`) ;
  - **`::part()`** : les éléments marqués `part="value"` peuvent être stylés de l'extérieur (`ui-gauge::part(value)`), et
    rien d'autre ;
  - **`:state()`** : l'état personnalisé exposé par `ElementInternals` (`ui-gauge:state(critical)`).
- **Événements** : un événement qui sort de l'ombre est « reciblé » : vu de l'extérieur, sa cible est `<ui-gauge>`, pas l'élément
  interne. Pour qu'un événement personnalisé sorte : `composed: true` (et `bubbles: true`).
- **Accessibilité** : le contenu de l'ombre fait partie de l'arbre d'accessibilité. Notre `role="meter"` est à l'intérieur.
  Mais un `aria-labelledby` ne peut pas viser un `id` de l'autre côté de la frontière (les `id` sont propres à chaque racine).

## 3. Slots : afficher le contenu fourni par la page

```html
<ui-gauge value="9" label="Battery">Plug in soon</ui-gauge>
```

- « Plug in soon » reste dans le **DOM léger** (light DOM, celui de la page) ; le `<slot>` du gabarit indique **où l'afficher**.
  Le texte n'est pas copié : il est **projeté**. Il garde donc les styles de la page.
- **Slot par défaut** (`<slot>`) ou **nommé** (`<slot name="footer">` + `<span slot="footer">`).
- **`::slotted(span)`** stylise depuis l'intérieur les enfants projetés (premier niveau seulement).
- **`slotchange`** : ajouter du contenu projeté ne relance pas le rendu de Lit. On écoute `slotchange` pour savoir si le slot est
  vide, et on cache sa zone sinon (`#onSlotChange` → `hasExtra`).
- **Piège d'accessibilité rencontré ici** : les enfants d'un `role="meter"` sont « présentationnels » (ignorés par les lecteurs
  d'écran). Le slot est donc placé **à côté** du compteur, pas dedans.

## 4. Lit : propriétés réactives et cycle de mise à jour

Lit = `LitElement` (réactivité + cycle de vie) + `lit-html` (gabarits).

**Propriétés réactives**

```ts
@property({ type: Number }) value = 0;   // API publique : propriété + attribut "value"
@state() private hasExtra = false;        // état interne : pas d'attribut, réactif quand même
```

- Changer une propriété réactive **programme** un rendu ; elle ne le fait pas tout de suite.
- `@property` relie un **attribut** HTML (toujours du texte) à une **propriété** JS (typée) : `type: Number` convertit
  `"72"` → `72`. Le test « reacts to attribute changes » le vérifie.
- `reflect: true` ferait l'inverse (propriété → attribut). On l'évite ici : un composant ne devrait pas ajouter d'attributs
  sur sa propre balise sans raison.
- Une valeur **calculée** n'a pas besoin d'être réactive : `get status()` est recalculé à chaque rendu.

**Cycle de mise à jour** (asynchrone, groupé)

1. Une ou plusieurs propriétés changent → `requestUpdate()` ;
2. le rendu est programmé **une seule fois**, dans une microtâche : `el.value = 1; el.value = 2;` ne fait qu'un rendu ;
3. `shouldUpdate(changed)` → `willUpdate(changed)` (calculs avant le rendu : ici on met à jour les états CSS) →
   `render()` → `firstUpdated()` (première fois) → `updated(changed)` ;
4. la promesse `el.updateComplete` se résout. Les tests l'attendent : `el.value = 95; await el.updateComplete;`.

**Gabarits `html`…``**

- Un gabarit étiqueté : Lit analyse le HTML **une seule fois**, puis ne met à jour que les « trous » `${...}` qui ont changé.
  Pas de DOM virtuel ni de comparaison d'arbres.
- Types de liaison :
  - `attr=${v}` pour un attribut ;
  - `.value=${v}` pour une **propriété** (utilisé dans Storybook : nombres et `null` passés tels quels) ;
  - `?hidden=${bool}` pour un attribut booléen ;
  - `@slotchange=${fn}` pour un écouteur d'événement.
- `svg`…`` pour les fragments SVG ; `nothing` pour ne rien rendre.

**Décorateurs** (point technique utile en entrevue)

- Les décorateurs sont du « sucre » pour `static properties = { value: { type: Number } }`.
- Il en existe deux versions. Les **décorateurs TC39 standard** (`@property() accessor value`) n'ont pas pu être utilisés ici :
  Vite 8 compile TypeScript avec oxc, qui ne les transforme pas encore (erreur « Unexpected token 'export' » dans le navigateur).
- Le projet utilise donc les **décorateurs « expérimentaux »** de TypeScript (`experimentalDecorators: true`), avec
  `useDefineForClassFields: false`. Sinon, les champs de classe écraseraient les accesseurs créés par Lit, et la réactivité
  serait perdue.

## 5. ElementInternals et états personnalisés

`this.attachInternals()` donne accès à des fonctions réservées à l'élément lui-même :

- **`states`** (CustomStateSet) : `states.add('critical')` permet `ui-gauge:state(critical)` en CSS. L'état est visible de
  l'extérieur sans être un attribut que la page pourrait modifier.
- On peut aussi y placer un rôle ARIA par défaut, ou faire participer l'élément à un formulaire (`formAssociated`) : utile pour
  un champ personnalisé.

## 6. Accessibilité de la jauge

- **`role="meter"`** : une mesure dans une plage connue (batterie, disque). `progressbar` sert à l'avancement d'une tâche.
- `aria-valuemin` / `aria-valuemax` / `aria-valuenow` : la valeur reste dans la plage. `aria-valuetext` dit ce qu'on entend :
  « 130 %, Critical », avec la vraie valeur lue.
- `aria-label` = le libellé. Le texte affiché à l'intérieur est `aria-hidden` pour ne pas être lu deux fois.
- **Jamais la couleur seule** (WCAG 1.4.1) : mot écrit « Warning », plus une icône de forme différente pour chaque état
  (cercle, triangle, octogone), lisible même en niveaux de gris.
- `prefers-reduced-motion` coupe l'animation de l'arc. Les couleurs par défaut respectent les contrastes, en clair comme en
  sombre (`light-dark()`).
- Test automatique avec axe : `await expect(el).to.be.accessible()`.

## 7. Outils du projet

- **Tests** : `@web/test-runner` (outil recommandé par Lit) lance les tests dans un vrai Chrome ; `@open-wc/testing` fournit
  `fixture`, `html` et `expect`. Un vrai navigateur, pas jsdom, parce que le Shadow DOM, les slots et `ElementInternals` doivent
  être réels.
- **Storybook** (`@storybook/web-components-vite`) : une « story » = un état du composant ; les `argTypes` deviennent des
  contrôles ; `tags: ['autodocs']` génère la page Docs ; l'extension a11y lance axe sur chaque story.
- **GitHub Actions** : tests → construction de Storybook → `upload-pages-artifact` → `deploy-pages`. Pas de branche `gh-pages`.

## Questions fréquentes en entrevue

- **Pourquoi des Web Components plutôt qu'un composant React ?** Ils sont standard et indépendants du framework : idéal pour
  un design system partagé entre plusieurs équipes et piles techniques. Limites : rendu serveur plus délicat (Declarative
  Shadow DOM), formulaires et accessibilité à travers l'ombre à gérer soi-même.
- **Lit par rapport aux Web Components « à la main » ?** Lit ajoute la réactivité, le rendu efficace par gabarits et les styles
  partagés (`adoptedStyleSheets`), pour environ 5 Ko. Le composant reste un vrai Custom Element.
- **Attribut ou propriété ?** Attribut = texte dans le HTML ; propriété = valeur JS (nombres, objets). On reçoit les deux et on
  ne reflète que si c'est utile au CSS.
- **Comment laisser personnaliser un composant encapsulé ?** Variables CSS (thème), `::part` (éléments choisis), slots (contenu),
  `:state()` (états).
- **Comment tester ?** Dans un vrai navigateur ; attendre `updateComplete` après chaque changement ; interroger
  `el.shadowRoot`.
