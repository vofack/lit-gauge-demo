import { expect, fixture, html } from '@open-wc/testing';
import { clamp, fraction, statusOf } from '../src/gauge-math.js';
import '../src/ui-gauge.js';
import type { UiGauge } from '../src/ui-gauge.js';

const meterOf = (el: UiGauge) => el.shadowRoot!.querySelector<HTMLElement>('[role="meter"]')!;
const statusText = (el: UiGauge) => el.shadowRoot!.querySelector('.status-text')!.textContent!.trim();
const dash = (el: UiGauge) => Number(el.shadowRoot!.querySelector('.indicator')!.getAttribute('stroke-dasharray')!.split(' ')[0]);

describe('gauge math', () => {
  it('clamps values and handles a reversed range', () => {
    expect(clamp(150, 0, 100)).to.equal(100);
    expect(clamp(-5, 0, 100)).to.equal(0);
    expect(clamp(50, 100, 0)).to.equal(50);
    expect(fraction(25, 0, 100)).to.equal(0.25);
    expect(fraction(10, 5, 5)).to.equal(0); // empty range
  });

  it('computes the status, higher is worse', () => {
    expect(statusOf(69, 70, 90)).to.equal('normal');
    expect(statusOf(70, 70, 90)).to.equal('warning'); // the threshold itself counts
    expect(statusOf(90, 70, 90)).to.equal('critical');
    expect(statusOf(95, null, null)).to.equal('normal'); // no thresholds
    expect(statusOf(95, undefined, 90)).to.equal('critical'); // critical only
  });

  it('computes the status, lower is worse (critical < warning)', () => {
    expect(statusOf(50, 30, 15)).to.equal('normal');
    expect(statusOf(30, 30, 15)).to.equal('warning');
    expect(statusOf(15, 30, 15)).to.equal('critical');
  });
});

describe('<ui-gauge>', () => {
  it('is a registered custom element with a shadow root', async () => {
    const el = await fixture<UiGauge>(html`<ui-gauge value="42" unit="%" label="CPU"></ui-gauge>`);
    expect(customElements.get('ui-gauge')).to.equal(el.constructor);
    expect(el.shadowRoot).to.exist;
    expect(el.shadowRoot!.querySelector('.value')!.textContent).to.contain('42');
    expect(el.shadowRoot!.querySelector('.unit')!.textContent).to.equal('%');
    expect(el.shadowRoot!.querySelector('.label')!.textContent).to.equal('CPU');
  });

  it('draws the arc in proportion to the value', async () => {
    const el = await fixture<UiGauge>(html`<ui-gauge value="50"></ui-gauge>`);
    expect(dash(el)).to.be.closeTo(37.5, 0.001); // half of the 75 % arc
    el.value = 100;
    await el.updateComplete; // Lit batches updates: wait for the re-render
    expect(dash(el)).to.be.closeTo(75, 0.001);
  });

  it('exposes role="meter" and the ARIA values', async () => {
    const el = await fixture<UiGauge>(html`<ui-gauge value="72" min="10" max="120" unit="°C" label="Temperature" warning="70" critical="90"></ui-gauge>`);
    const meter = meterOf(el);
    expect(meter.getAttribute('aria-label')).to.equal('Temperature');
    expect(meter.getAttribute('aria-valuemin')).to.equal('10');
    expect(meter.getAttribute('aria-valuemax')).to.equal('120');
    expect(meter.getAttribute('aria-valuenow')).to.equal('72');
    expect(meter.getAttribute('aria-valuetext')).to.equal('72 °C, Warning');
  });

  it('keeps aria-valuenow in range but tells the real reading', async () => {
    const el = await fixture<UiGauge>(html`<ui-gauge value="130" max="100" unit="%" critical="90"></ui-gauge>`);
    expect(meterOf(el).getAttribute('aria-valuenow')).to.equal('100');
    expect(meterOf(el).getAttribute('aria-valuetext')).to.equal('130 %, Critical');
  });

  it('shows the status in words, not only in colour', async () => {
    const el = await fixture<UiGauge>(html`<ui-gauge value="10" warning="70" critical="90"></ui-gauge>`);
    expect(statusText(el)).to.equal('Normal');
    el.value = 75;
    await el.updateComplete;
    expect(statusText(el)).to.equal('Warning');
    el.value = 95;
    await el.updateComplete;
    expect(statusText(el)).to.equal('Critical');
    expect(el.status).to.equal('critical');
    expect(el.shadowRoot!.querySelector('.gauge')!.classList.contains('critical')).to.be.true;
  });

  it('exposes the status as a CSS custom state', async () => {
    const el = await fixture<UiGauge>(html`<ui-gauge value="95" critical="90"></ui-gauge>`);
    expect(el.matches(':state(critical)')).to.be.true;
    el.value = 5;
    await el.updateComplete;
    expect(el.matches(':state(critical)')).to.be.false;
    expect(el.matches(':state(normal)')).to.be.true;
  });

  it('reacts to attribute changes (attribute → property)', async () => {
    const el = await fixture<UiGauge>(html`<ui-gauge value="20"></ui-gauge>`);
    el.setAttribute('value', '80');
    await el.updateComplete;
    expect(el.value).to.equal(80);
    expect(meterOf(el).getAttribute('aria-valuenow')).to.equal('80');
  });

  it('shows the slotted content only when there is some', async () => {
    const empty = await fixture<UiGauge>(html`<ui-gauge value="20"></ui-gauge>`);
    expect(empty.shadowRoot!.querySelector<HTMLElement>('.extra')!.hidden).to.be.true;
    const filled = await fixture<UiGauge>(html`<ui-gauge value="20"><span>Updated 2 min ago</span></ui-gauge>`);
    await filled.updateComplete; // slotchange sets state, which triggers one more render
    expect(filled.shadowRoot!.querySelector<HTMLElement>('.extra')!.hidden).to.be.false;
  });

  it('can be styled from outside with CSS variables', async () => {
    const el = await fixture<UiGauge>(html`<ui-gauge value="95" critical="90" style="--ui-gauge-color-critical: rgb(1, 2, 3)"></ui-gauge>`);
    const stroke = getComputedStyle(el.shadowRoot!.querySelector('.indicator')!).stroke;
    expect(stroke).to.equal('rgb(1, 2, 3)');
  });

  it('passes axe accessibility checks', async () => {
    const el = await fixture<UiGauge>(html`<ui-gauge value="55" unit="%" label="Memory" warning="70" critical="90">Updated now</ui-gauge>`);
    await expect(el).to.be.accessible();
  });
});
