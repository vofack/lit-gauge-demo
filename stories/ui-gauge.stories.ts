import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing } from 'lit';
import '../src/ui-gauge.js';

type GaugeArgs = {
  value: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  warning: number | undefined;
  critical: number | undefined;
  size: string;
  slotText: string;
};

const meta = {
  title: 'Components/ui-gauge',
  component: 'ui-gauge',
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 }, description: 'Current reading' },
    min: { control: 'number', description: 'Lowest value of the range' },
    max: { control: 'number', description: 'Highest value of the range' },
    unit: { control: 'text', description: 'Unit shown after the value' },
    label: { control: 'text', description: 'Visible label, also the accessible name' },
    warning: { control: 'number', description: 'Warning threshold (optional)' },
    critical: { control: 'number', description: 'Critical threshold (optional). Lower than warning → lower is worse' },
    size: { control: 'text', description: 'CSS variable --ui-gauge-size', table: { category: 'CSS variables' } },
    slotText: { control: 'text', description: 'Content of the default slot', table: { category: 'Slots' } },
  },
  args: {
    value: 42,
    min: 0,
    max: 100,
    unit: '%',
    label: 'CPU',
    warning: 70,
    critical: 90,
    size: '12rem',
    slotText: '',
  },
  render: (a) => html`
    <ui-gauge
      .value=${a.value}
      .min=${a.min}
      .max=${a.max}
      .unit=${a.unit}
      .label=${a.label}
      .warning=${a.warning ?? null}
      .critical=${a.critical ?? null}
      style="--ui-gauge-size: ${a.size}"
      >${a.slotText ? html`<span>${a.slotText}</span>` : nothing}</ui-gauge
    >
  `,
} satisfies Meta<GaugeArgs>;

export default meta;
type Story = StoryObj<GaugeArgs>;

/** Every property is a control: move the value slider across the thresholds. */
export const Playground: Story = {};

export const Normal: Story = { args: { value: 35 } };

export const Warning: Story = { args: { value: 76 } };

export const Critical: Story = { args: { value: 94 } };

/** When `critical` is lower than `warning`, lower values are worse (battery, fuel, signal…). */
export const LowerIsWorse: Story = {
  args: { value: 12, label: 'Battery', warning: 30, critical: 15 },
};

/** Any range and unit. Out-of-range readings are shown as read; the arc stops at the limit. */
export const TemperatureOutOfRange: Story = {
  argTypes: { value: { control: { type: 'range', min: -20, max: 140, step: 1 } } },
  args: { value: 128, min: -20, max: 120, unit: '°C', label: 'Engine', warning: 95, critical: 110 },
};

export const WithSlot: Story = {
  args: { value: 58, label: 'Memory', slotText: 'Updated 2 min ago' },
};

/** Restyled from outside with CSS variables and `::part()`, without touching the component. */
export const CustomTheme: Story = {
  args: { value: 64, label: 'Throughput', unit: 'MB/s', max: 120, warning: 80, critical: 100 },
  render: (a) => html`
    <style>
      .brand {
        --ui-gauge-size: 14rem;
        --ui-gauge-thickness: 6;
        --ui-gauge-color-normal: light-dark(#5b21b6, #c4b5fd);
        --ui-gauge-track-color: light-dark(#ede9fe, #2e1065);
        --ui-gauge-font-family: Georgia, serif;
      }
      .brand::part(value) {
        letter-spacing: -0.02em;
      }
    </style>
    <ui-gauge class="brand" .value=${a.value} .max=${a.max} .unit=${a.unit} .label=${a.label} .warning=${a.warning ?? null} .critical=${a.critical ?? null}></ui-gauge>
  `,
};

/** Styling the host from its custom state: `ui-gauge:state(critical)`. */
export const CustomStates: Story = {
  args: { value: 93 },
  render: (a) => html`
    <style>
      .stateful:state(critical) {
        outline: 3px dashed light-dark(#cf222e, #f85149);
        outline-offset: 0.5rem;
        border-radius: 1rem;
      }
    </style>
    <ui-gauge class="stateful" .value=${a.value} unit="%" label="Disk" warning="70" critical="90"></ui-gauge>
  `,
};

export const Dashboard: Story = {
  parameters: { controls: { disable: true } },
  render: () => html`
    <div style="display:flex;flex-wrap:wrap;gap:2rem;justify-content:center;--ui-gauge-size:9rem">
      <ui-gauge value="23" unit="%" label="CPU" warning="70" critical="90"></ui-gauge>
      <ui-gauge value="78" unit="%" label="Memory" warning="70" critical="90"></ui-gauge>
      <ui-gauge value="97" unit="%" label="Disk" warning="80" critical="95"></ui-gauge>
      <ui-gauge value="64" max="120" unit="°C" label="GPU" warning="85" critical="100"></ui-gauge>
      <ui-gauge value="9" unit="%" label="Battery" warning="30" critical="15"><span>Plug in soon</span></ui-gauge>
    </div>
  `,
};
