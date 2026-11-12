import { LitElement, css, html, svg, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { SWEEP, START_ANGLE, clamp, fraction, isSet, pointAt, range, statusOf, type GaugeStatus } from './gauge-math.js';

export type { GaugeStatus } from './gauge-math.js';

/** Words shown next to the icon: the status is never given by colour alone. */
const STATUS_TEXT: Record<GaugeStatus, string> = {
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
};

/** One shape per status (circle, triangle, octagon), readable in greyscale. */
const STATUS_ICON: Record<GaugeStatus, ReturnType<typeof svg>> = {
  normal: svg`<circle cx="8" cy="8" r="6.5"/><path d="M5 8.2l2 2 4-4.2" class="mark"/>`,
  warning: svg`<path d="M8 1.5l7 12.5H1z"/><path d="M8 6v3.6M8 11.6v.4" class="mark"/>`,
  critical: svg`<path d="M5.3 1.5h5.4l3.8 3.8v5.4l-3.8 3.8H5.3l-3.8-3.8V5.3z"/><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" class="mark"/>`,
};

const RADIUS = 40;

/**
 * `<ui-gauge>`: a circular gauge (SVG) with warning and critical thresholds.
 *
 * @slot - Extra content under the value (e.g. "Updated 2 min ago").
 * @csspart meter - The element with role="meter".
 * @csspart track - The background arc.
 * @csspart indicator - The arc that shows the value.
 * @csspart threshold - The tick marks of the warning and critical thresholds.
 * @csspart value - The number and its unit.
 * @csspart label - The label under the value.
 * @csspart status - The status badge (icon + word).
 * @cssprop --ui-gauge-size - Width of the gauge (default 10rem).
 * @cssprop --ui-gauge-thickness - Arc thickness, in SVG units out of 100 (default 10).
 * @cssprop --ui-gauge-track-color - Background arc colour.
 * @cssprop --ui-gauge-color-normal - Colour of the normal state.
 * @cssprop --ui-gauge-color-warning - Colour of the warning state.
 * @cssprop --ui-gauge-color-critical - Colour of the critical state.
 * @cssprop --ui-gauge-text-color - Main text colour.
 * @cssprop --ui-gauge-muted-color - Label and unit colour.
 * @cssprop --ui-gauge-font-family - Font of the texts.
 * @cssprop --ui-gauge-transition - Arc animation (set to `none` to disable).
 */
@customElement('ui-gauge')
export class UiGauge extends LitElement {
  /** Current reading. Out-of-range values are shown as read, but the arc stops at the limits. */
  @property({ type: Number }) value = 0;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  /** Unit shown after the value ("%", "°C", "km/h"…). */
  @property() unit = '';
  /** Visible label, also the accessible name of the meter. */
  @property() label = '';
  /** Warning threshold (optional). */
  @property({ type: Number }) warning: number | null = null;
  /** Critical threshold (optional). If lower than `warning`, lower values are worse. */
  @property({ type: Number }) critical: number | null = null;

  /** True when something is slotted: the extra line is hidden otherwise. */
  @state() private hasExtra = false;

  /** ElementInternals lets the host expose custom states: `ui-gauge:state(critical)`. */
  #internals: ElementInternals | undefined;

  constructor() {
    super();
    try {
      this.#internals = this.attachInternals();
    } catch {
      this.#internals = undefined; // very old browsers: the status is still in the shadow DOM
    }
  }

  /** Current status, computed from `value`, `warning` and `critical`. Read-only. */
  get status(): GaugeStatus {
    return statusOf(this.value, this.warning, this.critical);
  }

  static override styles = css`
    :host {
      --_size: var(--ui-gauge-size, 10rem);
      --_normal: var(--ui-gauge-color-normal, light-dark(#1a7f37, #3fb950));
      --_warning: var(--ui-gauge-color-warning, light-dark(#9a6700, #d29922));
      --_critical: var(--ui-gauge-color-critical, light-dark(#cf222e, #f85149));
      --_track: var(--ui-gauge-track-color, light-dark(#d0d7de, #30363d));
      --_text: var(--ui-gauge-text-color, light-dark(#1f2328, #e6edf3));
      --_muted: var(--ui-gauge-muted-color, light-dark(#59636e, #9198a1));
      --_thickness: var(--ui-gauge-thickness, 10);
      display: inline-block;
      inline-size: var(--_size);
      color: var(--_text);
      font-family: var(--ui-gauge-font-family, system-ui, sans-serif);
      line-height: 1.2;
      vertical-align: top;
    }
    :host([hidden]) {
      display: none;
    }
    .gauge {
      display: grid;
      justify-items: center;
      gap: 0.35em;
      font-size: calc(var(--_size) / 10);
    }
    .meter {
      position: relative;
      display: grid;
      justify-items: center;
      inline-size: 100%;
    }
    svg.dial {
      display: block;
      inline-size: 100%;
      block-size: auto;
      overflow: visible;
    }
    .track,
    .indicator {
      fill: none;
      stroke-width: var(--_thickness);
      stroke-linecap: round;
    }
    .track {
      stroke: var(--_track);
    }
    .indicator {
      stroke: var(--_color);
      transition: var(--ui-gauge-transition, stroke-dasharray 0.6s ease, stroke 0.3s ease);
    }
    .tick {
      stroke: var(--_text);
      stroke-width: 1.5;
      opacity: 0.7;
    }
    .readout {
      position: absolute;
      inset: 0 0 auto;
      aspect-ratio: 1;
      display: grid;
      place-content: center;
      text-align: center;
    }
    .value {
      font-size: 2.4em;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .unit {
      margin-inline-start: 0.1em;
      font-size: 0.5em;
      font-weight: 600;
      color: var(--_muted);
    }
    .label {
      font-size: 1em;
      color: var(--_muted);
      max-inline-size: 7em;
      overflow-wrap: anywhere;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.35em;
      margin-block-start: -1.4em; /* sits in the gap at the bottom of the arc */
      padding: 0.15em 0.6em;
      border: 1px solid var(--_color);
      border-radius: 999px;
      font-size: 1em;
      font-weight: 600;
    }
    .status svg {
      inline-size: 1.1em;
      block-size: 1.1em;
      fill: var(--_color);
    }
    .status .mark {
      fill: none;
      stroke: light-dark(#fff, #0d1117);
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .extra {
      font-size: 0.85em;
      color: var(--_muted);
      text-align: center;
    }
    .extra[hidden] {
      display: none;
    }
    .normal {
      --_color: var(--_normal);
    }
    .warning {
      --_color: var(--_warning);
    }
    .critical {
      --_color: var(--_critical);
    }
    @media (prefers-reduced-motion: reduce) {
      .indicator {
        transition: none;
      }
    }
  `;

  /** Runs before each render: keeps the host's custom state in sync with the status. */
  protected override willUpdate(_changed: PropertyValues<this>): void {
    const states = this.#internals?.states;
    if (states === undefined) return;
    for (const s of ['normal', 'warning', 'critical'] as const) {
      if (s === this.status) states.add(s);
      else states.delete(s);
    }
  }

  /** A slot does not re-render the component: we listen to `slotchange` to know if it has content. */
  #onSlotChange(e: Event): void {
    const slot = e.target as HTMLSlotElement;
    this.hasExtra = slot.assignedNodes({ flatten: true }).some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '');
  }

  #format(n: number): string {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);
  }

  #tick(threshold: number | null) {
    if (!isSet(threshold)) return nothing;
    const { lo, hi } = range(this.min, this.max);
    if (threshold <= lo || threshold >= hi) return nothing;
    const angle = START_ANGLE + SWEEP * fraction(threshold, lo, hi);
    const a = pointAt(angle, RADIUS - 7);
    const b = pointAt(angle, RADIUS + 7);
    return svg`<line class="tick" part="threshold" x1=${a.x} y1=${a.y} x2=${b.x} y2=${b.y} />`;
  }

  protected override render() {
    const status = this.status;
    const { lo, hi } = range(this.min, this.max);
    const shown = this.#format(this.value);
    const unitText = this.unit ? ` ${this.unit}` : '';
    // pathLength="100": dash lengths become percentages of the circle, whatever the radius.
    const arc = (SWEEP / 360) * 100;
    const filled = arc * fraction(this.value, lo, hi);

    return html`
      <div class="gauge ${status}">
        <div
          class="meter"
          part="meter"
          role="meter"
          aria-label=${this.label || 'Gauge'}
          aria-valuemin=${lo}
          aria-valuemax=${hi}
          aria-valuenow=${clamp(this.value, lo, hi)}
          aria-valuetext="${shown}${unitText}, ${STATUS_TEXT[status]}"
        >
          <svg class="dial" viewBox="0 0 100 100" aria-hidden="true">
            <g transform="rotate(${START_ANGLE} 50 50)">
              <circle class="track" part="track" cx="50" cy="50" r=${RADIUS} pathLength="100" stroke-dasharray="${arc} 100" />
              <circle
                class="indicator"
                part="indicator"
                cx="50"
                cy="50"
                r=${RADIUS}
                pathLength="100"
                stroke-dasharray="${filled} 100"
                visibility=${filled > 0 ? 'visible' : 'hidden'}
              />
            </g>
            ${this.#tick(this.warning)} ${this.#tick(this.critical)}
          </svg>
          <div class="readout" aria-hidden="true">
            <span class="value" part="value">${shown}${this.unit ? html`<span class="unit">${this.unit}</span>` : nothing}</span>
            ${this.label ? html`<span class="label" part="label">${this.label}</span>` : nothing}
          </div>
          <span class="status" part="status" aria-hidden="true">
            <svg viewBox="0 0 16 16">${STATUS_ICON[status]}</svg>
            <span class="status-text">${STATUS_TEXT[status]}</span>
          </span>
        </div>
        <!-- Outside the meter: the children of role="meter" are presentational (ignored by screen readers). -->
        <div class="extra" ?hidden=${!this.hasExtra}><slot @slotchange=${this.#onSlotChange}></slot></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-gauge': UiGauge;
  }
}
