import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';
import { BRAND } from './brand';

// Sidebar: our name instead of the Storybook logo, in the viewer's colour scheme.
const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
addons.setConfig({
  theme: create({ base: dark ? 'dark' : 'light', brandTitle: BRAND, brandUrl: 'https://github.com/vofack/lit-gauge-demo', brandTarget: '_blank' }),
});

// Browser tab: Storybook writes "… ⋅ Storybook" on every navigation (hard-coded): replace that suffix.
const rename = (title: string): string => {
  if (title === 'Storybook' || title.endsWith(' - Storybook')) return BRAND;
  return title.replace(/ ⋅ Storybook$/, ` ⋅ ${BRAND}`);
};
const fix = (): void => {
  const next = rename(document.title);
  if (next !== document.title) document.title = next;
};
fix();
new MutationObserver(fix).observe(document.head, { subtree: true, childList: true, characterData: true });
