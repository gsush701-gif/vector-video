// The light theme, explained in the light theme.
// Render with:  node scripts/render.js examples/light-theme.js light-theme.mp4

// Colors of the old dark look, used only for the "before" mock-ups.
const DARK = { bg: '#0f172a', text: '#e2e8f0', dim: '#94a3b8', panel: '#1e293b', line: '#334155', green: '#22c55e', greenFill: '#14532d' };

module.exports = ({ palette: P } = {}) => {
  const title = (text, t = 0.2) => ({ type: 'text', text, x: 640, y: 80, size: 38, bold: true, align: 'center', fill: P.text, appear: { t, effect: 'up' } });

  // A small "video frame" that flips from dark to light on a cue.
  function flipFrame(x, y, w, h, t) {
    const k = (props) => [{ t, dur: 1.2, ...props }];
    return {
      type: 'group', x, y, appear: { t: 0.4, effect: 'pop' },
      children: [
        { type: 'rect', x: 0, y: 0, w, h, rx: 16, fill: DARK.bg, stroke: P.line, strokeWidth: 2, keyframes: k({ fill: '#ffffff' }) },
        { type: 'text', text: 'Binary search', x: 40, y: 64, size: 30, bold: true, fill: DARK.text, keyframes: k({ fill: P.text }) },
        ...[0, 1, 2, 3, 4].map((i) => ({
          type: 'box', x: 40 + i * 92, y: 104, w: 76, h: 64, rx: 10, text: String([2, 5, 8, 12, 16][i]), size: 24,
          fill: i === 2 ? DARK.greenFill : DARK.panel, stroke: i === 2 ? DARK.green : DARK.dim, textColor: DARK.text,
          keyframes: k(i === 2 ? { fill: P.greenFill, stroke: P.green, textColor: P.text } : { fill: P.panel, stroke: P.boxStroke, textColor: P.text }),
        })),
        { type: 'text', text: 'mid = 2  →  8', x: 40, y: 222, size: 22, fill: DARK.dim, keyframes: k({ fill: P.dim }) },
        { type: 'rect', x: 90, y: h - 58, w: w - 180, h: 40, rx: 8, fill: '#000000', opacity: 0.6, keyframes: k({ fill: P.captionBg, opacity: 0.85 }) },
        { type: 'text', text: 'The middle number is 8.', x: w / 2, y: h - 38, size: 18, align: 'center', valign: 'middle', fill: '#ffffff' },
      ],
    };
  }

  function swatchCard(x, y, label, sub, color, t) {
    return {
      type: 'group', x, y, appear: { t, effect: 'up' },
      children: [
        { type: 'rect', x: 0, y: 0, w: 360, h: 74, rx: 12, fill: P.panel, stroke: P.line, strokeWidth: 2 },
        { type: 'rect', x: 16, y: 17, w: 40, h: 40, rx: 8, fill: color, stroke: P.line, strokeWidth: 2 },
        { type: 'text', text: label, x: 74, y: 33, size: 20, bold: true, fill: P.text },
        { type: 'text', text: sub, x: 74, y: 58, size: 16, fill: P.dim },
      ],
    };
  }

  return {
    theme: 'light',
    voice: 'af_heart',
    rate: 1,
    captions: true,
    scenes: [
      {
        name: 'intro',
        narration: [
          { say: 'Vector video now has a light theme.', cue: 'has' },
          { say: 'Same video, same script. Just a clean, white background.', cue: 'flip' },
        ],
        elements: [
          title('Light theme'),
          flipFrame(390, 150, 500, 330, '@flip+0.6'),
          { type: 'text', text: 'dark', x: 360, y: 320, size: 20, fill: P.dim, align: 'right', appear: { t: 0.6, effect: 'fade' }, disappear: '@flip+0.6' },
          { type: 'text', text: 'light', x: 920, y: 320, size: 20, fill: P.blue, bold: true, appear: { t: '@flip+1.4', effect: 'fade' } },
        ],
      },
      {
        name: 'turn-on',
        narration: [
          { say: 'Turning it on takes one line in the script.', cue: 'line' },
          { say: 'Or add the theme light option when you render.', cue: 'flag' },
          { say: 'And new videos made by the agent start white, automatically.', cue: 'agent' },
        ],
        elements: [
          title('Turn it on'),
          { type: 'code', x: 200, y: 160, w: 880, size: 22, lineHeight: 1.5,
            lines: ['module.exports = {', "  theme: 'light',", "  voice: 'af_heart',", '  scenes: [ ... ],', '};'],
            appear: { t: '@line', effect: 'fade' }, highlight: -1,
            keyframes: [{ t: '@line+1.2', dur: 0, highlight: 1 }] },
          { type: 'code', x: 200, y: 400, w: 880, size: 22, lines: [{ text: '$ node render.js video.js video.mp4 --theme light', color: P.green }],
            appear: { t: '@flag', effect: 'up' } },
          { type: 'box', x: 390, y: 500, w: 500, h: 56, rx: 28, text: 'new videos: light by default', size: 22,
            fill: P.brandFill, stroke: P.brand, textColor: P.text, appear: { t: '@agent+0.5', effect: 'pop' } },
        ],
      },
      {
        name: 'recolors',
        narration: [
          { say: 'The theme recolors everything the renderer draws for you.', cue: 'all' },
          { say: 'The background, the text, boxes, and code panels.', cue: 'parts' },
          { say: 'The highlight bar gets stronger, and captions sit on a dark bar, so they stay easy to read.', cue: 'read' },
        ],
        elements: [
          title('What changes'),
          swatchCard(140, 150, 'Background', 'white', '#ffffff', '@parts'),
          swatchCard(140, 240, 'Text', 'dark slate', P.text, '@parts+0.6'),
          swatchCard(140, 330, 'Boxes', 'pale fill, grey border', P.boxFill, '@parts+1.2'),
          swatchCard(140, 420, 'Code panels', 'soft grey', P.codePanel, '@parts+1.8'),
          swatchCard(780, 240, 'Highlight bar', 'yellow, stronger', P.highlight, '@read+0.3'),
          swatchCard(780, 330, 'Captions', 'white on a dark bar', P.captionBg, '@read+2.4'),
          { type: 'line', x1: 640, y1: 160, x2: 640, y2: 500, stroke: P.line, strokeWidth: 2, dash: '6 6', appear: { t: '@all', effect: 'draw', dur: 0.6 } },
        ],
      },
      {
        name: 'palette',
        minDuration: 8.5,
        narration: [
          { say: 'Scripts can also ask for the theme colors.', cue: 'ask' },
          { say: 'Then one script works in both themes.', cue: 'both' },
        ],
        elements: [
          title('One script, both themes'),
          { type: 'code', x: 80, y: 170, w: 600, size: 19, lineHeight: 1.5,
            lines: [
              'module.exports = ({ palette: P }) => ({',
              '  scenes: [{ elements: [',
              "    { type: 'box', text: 'ok',",
              '      fill: P.greenFill, stroke: P.green },',
              '  ] }],',
              '});',
            ],
            appear: { t: '@ask', effect: 'fade' }, highlight: -1,
            keyframes: [{ t: '@ask+1.2', dur: 0, highlight: [0, 3] }] },
          { type: 'rect', x: 740, y: 170, w: 210, h: 230, rx: 14, fill: DARK.bg, stroke: P.line, strokeWidth: 2, appear: { t: '@both', effect: 'pop' } },
          { type: 'box', x: 785, y: 245, w: 120, h: 70, rx: 12, text: 'ok', size: 26, fill: DARK.greenFill, stroke: DARK.green, textColor: DARK.text, appear: { t: '@both+0.2', effect: 'pop' } },
          { type: 'text', text: '--theme dark', x: 845, y: 440, size: 18, mono: true, fill: P.dim, align: 'center', appear: { t: '@both', effect: 'fade' } },
          { type: 'rect', x: 990, y: 170, w: 210, h: 230, rx: 14, fill: '#ffffff', stroke: P.line, strokeWidth: 2, appear: { t: '@both+0.5', effect: 'pop' } },
          { type: 'box', x: 1035, y: 245, w: 120, h: 70, rx: 12, text: 'ok', size: 26, fill: P.greenFill, stroke: P.green, textColor: P.text, appear: { t: '@both+0.7', effect: 'pop' } },
          { type: 'text', text: '--theme light', x: 1095, y: 440, size: 18, mono: true, fill: P.blue, align: 'center', appear: { t: '@both+0.5', effect: 'fade' } },
        ],
      },
      {
        name: 'outro',
        narration: [
          { say: 'Older scripts keep their dark look, so nothing breaks.', cue: 'old' },
          { say: 'Everything new starts light.', cue: 'new' },
        ],
        elements: [
          { type: 'box', x: 190, y: 270, w: 400, h: 90, rx: 18, text: 'older scripts stay dark', size: 26,
            fill: DARK.bg, stroke: DARK.dim, textColor: DARK.text, appear: { t: '@old', effect: 'pop' } },
          { type: 'box', x: 690, y: 270, w: 400, h: 90, rx: 18, text: 'new videos start light', size: 26,
            fill: '#ffffff', stroke: P.blue, strokeWidth: 3, textColor: P.text, appear: { t: '@new', effect: 'pop' } },
          { type: 'text', text: 'vector-video  ·  theme: light', x: 640, y: 470, size: 24, mono: true, fill: P.dim, align: 'center', appear: { t: '@new+0.8', effect: 'fade' } },
        ],
      },
    ],
  };
};
