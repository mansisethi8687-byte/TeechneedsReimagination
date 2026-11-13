// Generative avatar: "growth rings". Each ring is one topic; its arc length is
// the person's mastery (mentee) or share of published work (mentor). The
// rotation comes from a hash of the account id, so two people with the same
// numbers still look different, and the same data always gives the same mark.
// Colours are CSS variables, so the mark follows the light/dark theme.
const crypto = require('crypto');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function seedFrom(id) {
  const h = crypto.createHash('sha256').update(String(id)).digest();
  return h.readUInt32BE(0);
}

function arcPath(cx, cy, r, startDeg, sweepDeg) {
  const sweep = Math.max(0.0001, Math.min(359.999, sweepDeg));
  const a0 = ((startDeg - 90) * Math.PI) / 180;
  const a1 = ((startDeg + sweep - 90) * Math.PI) / 180;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = sweep > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/**
 * @param id       account id (seed)
 * @param name     full name (initials in the centre)
 * @param rings    [{ label, value 0..100 }], outermost first, at most 5 used
 */
function growthRings({ id, name = '', rings = [] }) {
  const seed = seedFrom(id);
  const size = 160;
  const c = size / 2;
  const used = rings.slice(0, 5);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';
  const opacities = [1, 0.8, 0.62, 0.48, 0.36];
  const parts = used.map((ring, i) => {
    const r = 70 - i * 11;
    const start = (seed >> (i * 5)) % 360;
    const v = Math.max(0, Math.min(100, Math.round(ring.value || 0)));
    return [
      `<circle cx="${c}" cy="${c}" r="${r}" fill="none" style="stroke:var(--line-strong)" stroke-width="6"/>`,
      // A 100% arc starts and ends on the same point, which SVG renders as a
      // sliver; draw full rings as circles instead.
      v >= 100 ? `<circle cx="${c}" cy="${c}" r="${r}" fill="none" style="stroke:var(--accent)" stroke-opacity="${opacities[i]}" stroke-width="6"/>`
        : v > 0 ? `<path d="${arcPath(c, c, r, start, (v / 100) * 360)}" fill="none" style="stroke:var(--accent)" stroke-opacity="${opacities[i]}" stroke-width="6" stroke-linecap="round"/>` : '',
    ].join('');
  });
  const title = used.length
    ? `Growth rings: ${used.map((r) => `${r.label} ${Math.round(r.value || 0)}%`).join(', ')}`
    : 'Growth rings: no scored topics yet';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(title)}">`,
    `<title>${esc(title)}</title>`,
    ...parts,
    `<circle cx="${c}" cy="${c}" r="${used.length ? 70 - used.length * 11 - 2 : 30}" style="fill:var(--ink-3)"/>`,
    `<text x="${c}" y="${c}" text-anchor="middle" dominant-baseline="central" style="fill:var(--paper);font-family:var(--font-sans);font-weight:600" font-size="${used.length >= 4 ? 14 : 22}">${esc(initials)}</text>`,
    '</svg>',
  ].join('');
}

module.exports = { growthRings, seedFrom };
