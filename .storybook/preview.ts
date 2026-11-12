import type { Decorator, Preview } from '@storybook/web-components-vite';
import { html } from 'lit';

/** Light / dark toolbar: the gauge follows `color-scheme` through CSS light-dark(). */
const withTheme: Decorator = (story, context) => {
  const dark = context.globals['theme'] === 'dark';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  document.body.style.background = dark ? '#0d1117' : '#ffffff';
  document.body.style.color = dark ? '#e6edf3' : '#1f2328';
  return html`${story()}`;
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Colour scheme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    a11y: { test: 'error' },
  },
};

export default preview;
