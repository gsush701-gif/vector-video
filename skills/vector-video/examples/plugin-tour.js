// A tour of vector-video, made with vector-video.
// Render with:  node scripts/render.js examples/plugin-tour.js plugin-tour.mp4 [--theme light]
// Exports a function so its colors follow the theme the renderer passes in.

let C; // set from the renderer's palette below

const title = (text, t = 0.2) => ({ type: 'text', text, x: 640, y: 80, size: 38, bold: true, align: 'center', appear: { t, effect: 'up' } });

function card(x, y, w, h, head, sub, color, t) {
  return {
    type: 'group', x, y, appear: { t, effect: 'up' },
    children: [
      { type: 'rect', x: 0, y: 0, w, h, rx: 12, fill: C.panel, stroke: color, strokeWidth: 2.5 },
      { type: 'text', text: head, x: 22, y: 36, size: 22, bold: true, fill: color },
      { type: 'text', text: sub, x: 22, y: 66, size: 17, fill: C.dim },
    ],
  };
}

// ---------- scene 3: the five pipeline stages
const stageList = () => [
  { head: 'Speak', sub: 'Kokoro voice', color: C.violet, cue: '@speak' },
  { head: 'Time', sub: 'measure lines', color: C.blue, cue: '@time' },
  { head: 'Draw', sub: 'SVG frames', color: C.green, cue: '@draw' },
  { head: 'Rasterize', sub: 'resvg to pixels', color: C.yellow, cue: '@draw+1.6' },
  { head: 'Join', sub: 'ffmpeg to .mp4', color: C.orange, cue: '@join' },
];
const SX = (i) => 40 + i * 250;

function pipeline() {
  const stages = stageList();
  const out = [];
  stages.forEach((s, i) => {
    out.push(card(SX(i), 300, 200, 90, s.head, s.sub, s.color, s.cue));
    if (i < stages.length - 1) {
      out.push({ type: 'arrow', x1: SX(i) + 205, y1: 345, x2: SX(i + 1) - 5, y2: 345, color: C.dim, width: 3, head: 10,
        appear: { t: `${stages[i + 1].cue}-0.3`, effect: 'draw', dur: 0.3 } });
    }
  });
  return out;
}

// ---------- scene 4: timeline of spoken lines
const AX = 120, AY = 470;

module.exports = ({ theme = 'dark', palette } = {}) => {
  const light = theme === 'light';
  C = Object.assign({
    text: '#e2e8f0', dim: '#94a3b8', panel: '#1e293b', line: '#334155', brand: '#818cf8', brandFill: '#312e81',
    violet: '#a78bfa', green: '#22c55e', greenFill: '#14532d', red: '#ef4444', yellow: '#facc15', blue: '#60a5fa', orange: '#fb923c',
  }, palette, {
    barFill: light ? '#dbeafe' : '#1e3a5f',
    orangeFill: light ? '#ffedd5' : '#7c2d12',
    play: light ? '#ffffff' : '#e2e8f0',
  });
  return {
  voice: 'af_heart',
  rate: 1,
  captions: true,
  scenes: [
    {
      name: 'intro',
      narration: [
        { say: 'This is vector video. And this whole video was made by it.', cue: 'meta' },
        { say: 'You describe the video you want.', cue: 'ask' },
        { say: 'Your AI agent writes the script.', cue: 'agent' },
        { say: 'And the renderer turns it into a narrated video.', cue: 'io' },
      ],
      elements: [
        { type: 'text', text: 'vector-video', x: 640, y: 190, size: 72, bold: true, align: 'center', appear: { t: 0.3, effect: 'type', dur: 1 } },
        { type: 'text', text: 'this video was made with it', x: 640, y: 245, size: 26, fill: C.violet, align: 'center', appear: { t: '@meta+2', effect: 'fade' } },
        // your request, as a chat bubble
        { type: 'group', x: 120, y: 350, appear: { t: '@ask', effect: 'pop' }, children: [
          { type: 'rect', x: 0, y: 0, w: 220, h: 96, rx: 18, fill: C.panel, stroke: C.blue, strokeWidth: 3 },
          { type: 'polygon', points: [[30, 94], [30, 122], [62, 94]], fill: C.panel, stroke: C.blue, strokeWidth: 3 },
          { type: 'rect', x: 28, y: 88, w: 38, h: 9, fill: C.panel },
          { type: 'text', text: '"Explain MCP\nin a video"', x: 110, y: 40, size: 19, align: 'center', lineHeight: 1.3, fill: C.text },
        ] },
        { type: 'text', text: 'you ask', x: 230, y: 515, size: 20, fill: C.dim, align: 'center', appear: { t: '@ask', effect: 'fade' } },
        { type: 'arrow', x1: 355, y1: 405, x2: 435, y2: 405, color: C.text, width: 4, appear: { t: '@agent', effect: 'draw', dur: 0.4 } },
        // script file, written by the agent
        { type: 'group', x: 450, y: 330, appear: { t: '@agent+0.3', effect: 'pop' }, children: [
          { type: 'path', d: 'M 0 0 L 90 0 L 120 30 L 120 150 L 0 150 Z', fill: C.panel, stroke: C.brand, strokeWidth: 3 },
          { type: 'path', d: 'M 90 0 L 90 30 L 120 30', fill: 'none', stroke: C.brand, strokeWidth: 3 },
          { type: 'line', x1: 20, y1: 60, x2: 95, y2: 60, stroke: C.dim, strokeWidth: 4 },
          { type: 'line', x1: 20, y1: 85, x2: 80, y2: 85, stroke: C.dim, strokeWidth: 4 },
          { type: 'line', x1: 20, y1: 110, x2: 100, y2: 110, stroke: C.dim, strokeWidth: 4 },
        ] },
        { type: 'text', text: 'agent writes scene.js', x: 510, y: 515, size: 20, fill: C.dim, align: 'center', appear: { t: '@agent+0.3', effect: 'fade' } },
        { type: 'arrow', x1: 585, y1: 405, x2: 675, y2: 405, color: C.text, width: 4, appear: { t: '@io', effect: 'draw', dur: 0.4 } },
        { type: 'box', x: 685, y: 370, w: 190, h: 70, rx: 14, text: 'render.js', size: 22, mono: true, fill: C.brandFill, stroke: C.violet, textColor: C.text,
          appear: { t: '@io+0.3', effect: 'pop' } },
        { type: 'arrow', x1: 885, y1: 405, x2: 975, y2: 405, color: C.text, width: 4, appear: { t: '@io+1.2', effect: 'draw', dur: 0.4 } },
        { type: 'group', x: 985, y: 345, appear: { t: '@io+1.5', effect: 'pop' }, children: [
          { type: 'rect', x: 0, y: 0, w: 170, h: 120, rx: 14, fill: C.greenFill, stroke: C.green, strokeWidth: 3 },
          { type: 'polygon', points: [[68, 35], [68, 85], [110, 60]], fill: C.green },
        ] },
        { type: 'text', text: 'video.mp4', x: 1070, y: 515, size: 20, mono: true, fill: C.dim, align: 'center', appear: { t: '@io+1.5', effect: 'fade' } },
      ],
    },
    {
      name: 'script',
      narration: [
        { say: 'Under the hood, the script is plain JSON or JavaScript. You can edit it yourself, too.', cue: 'file' },
        { say: 'Each scene has narration lines. These are the words that get spoken.', cue: 'narr' },
        { say: 'And elements. These are the shapes that appear on screen.', cue: 'els' },
        { say: 'Give a line a cue name, and you can animate on that exact moment.', cue: 'cue' },
      ],
      elements: [
        title('The script'),
        { type: 'code', x: 80, y: 150, w: 620, size: 19, lineHeight: 1.5,
          lines: [
            '{',
            '  scenes: [{',
            '    narration: [',
            "      'This box turns green.',",
            "      { say: 'Then it moves.', cue: 'move' },",
            '    ],',
            '    elements: [',
            "      { type: 'box', text: '7', x: 200, y: 300,",
            "        appear: { t: 0.3, effect: 'pop' },",
            "        keyframes: [{ t: '@move', dx: 600 }] },",
            '    ],',
            '  }],',
            '}',
          ],
          appear: { t: '@file', effect: 'fade' },
          highlight: -1,
          keyframes: [
            { t: '@narr', dur: 0, highlight: [2, 3, 4] },
            { t: '@els', dur: 0, highlight: [6, 7, 8, 9] },
            { t: '@cue', dur: 0, highlight: [4, 9] },
          ] },
        { type: 'text', text: 'what it makes', x: 790, y: 190, size: 18, fill: C.dim, appear: { t: '@els', effect: 'fade' } },
        { type: 'box', x: 790, y: 260, w: 90, h: 90, rx: 12, text: '7', size: 36, fill: C.panel, stroke: C.dim, textColor: C.text,
          appear: { t: '@els+0.6', effect: 'pop' },
          keyframes: [
            { t: '@cue+0.8', dur: 0.3, fill: C.greenFill, stroke: C.green },
            { t: '@cue+1.8', dur: 1, dx: 300 },
          ] },
        { type: 'line', x1: 790, y1: 400, x2: 1180, y2: 400, stroke: C.line, strokeWidth: 2, dash: '6 6', appear: { t: '@cue', effect: 'draw', dur: 0.5 } },
        { type: 'text', text: "on the word cue: 'move'", x: 790, y: 440, size: 20, fill: C.yellow, appear: { t: '@cue+0.4', effect: 'fade' } },
      ],
    },
    {
      name: 'pipeline',
      narration: [
        { say: 'When you run the renderer, five things happen.', cue: 'run' },
        { say: 'First, Kokoro speaks every line, offline, on your own computer.', cue: 'speak' },
        { say: 'Each line is measured, so every scene lasts exactly as long as its speech.', cue: 'time' },
        { say: 'Every frame is drawn as vector graphics, then turned into pixels by res V G.', caption: 'Every frame is drawn as vector graphics, then turned into pixels by resvg.', cue: 'draw' },
        { say: 'Finally, F F mpeg joins the frames and the voice into an M P 4.', caption: 'Finally, ffmpeg joins the frames and the voice into an MP4.', cue: 'join' },
      ],
      elements: [
        title('What happens when you render'),
        { type: 'code', x: 330, y: 170, w: 620, size: 20, lines: ['$ node render.js scene.js video.mp4'], color: C.green,
          appear: { t: '@run', effect: 'fade' } },
        ...pipeline(),
        { type: 'text', text: 'about 1 second of work per second of video', x: 640, y: 480, size: 20, fill: C.dim, align: 'center',
          appear: { t: '@join+1.2', effect: 'fade' } },
      ],
    },
    {
      name: 'timing',
      narration: [
        { say: 'Timing is the clever part.', cue: 'clever' },
        { say: 'You never type a duration.', cue: 'nodur' },
        { say: 'The renderer measures its own voice, and places each animation on the line you named.', cue: 'place' },
        { say: 'Rewrite a sentence, and everything after it shifts to match.', cue: 'shift' },
      ],
      elements: [
        title('Narration drives the timing'),
        { type: 'arrow', x1: AX, y1: AY, x2: 1170, y2: AY, color: C.dim, width: 2, head: 10, appear: { t: 0.3, effect: 'draw', dur: 0.6 } },
        { type: 'text', text: 'time', x: 1170, y: AY + 32, size: 16, fill: C.dim, align: 'right', appear: { t: 0.3, effect: 'fade' } },
        { type: 'box', x: AX, y: AY - 60, w: 260, h: 44, rx: 8, text: 'line 1', size: 18, fill: C.barFill, stroke: C.blue, textColor: C.text,
          appear: { t: '@clever', effect: 'pop' },
          keyframes: [{ t: '@shift+0.8', dur: 0.8, w: 400 }] },
        { type: 'group', x: 0, y: 0,
          keyframes: [{ t: '@shift+0.8', dur: 0.8, dx: 140 }],
          children: [
            { type: 'box', x: AX + 280, y: AY - 60, w: 300, h: 44, rx: 8, text: "line 2  ·  cue: 'move'", size: 18, fill: C.barFill, stroke: C.blue, textColor: C.text,
              appear: { t: '@nodur', effect: 'pop' } },
            { type: 'box', x: AX + 600, y: AY - 60, w: 240, h: 44, rx: 8, text: 'line 3', size: 18, fill: C.barFill, stroke: C.blue, textColor: C.text,
              appear: { t: '@nodur+0.4', effect: 'pop' } },
            { type: 'arrow', x1: AX + 280, y1: 230, x2: AX + 280, y2: AY - 70, color: C.yellow, width: 3, appear: { t: '@place+1', effect: 'draw', dur: 0.5 } },
            { type: 'text', text: '@move', x: AX + 280, y: 215, size: 22, mono: true, fill: C.yellow, align: 'center', appear: { t: '@place+1', effect: 'fade' } },
            { type: 'circle', cx: AX + 280, cy: 300, r: 26, fill: C.green, appear: { t: '@place+2', effect: 'pop' } },
            { type: 'text', text: 'starts here', x: AX + 320, y: 307, size: 18, fill: C.green, appear: { t: '@place+2.2', effect: 'fade' } },
          ] },
        { type: 'text', text: 'longer sentence', x: AX + 200, y: AY + 50, size: 18, fill: C.orange, align: 'center', appear: { t: '@shift+0.8', effect: 'fade' } },
      ],
    },
    {
      name: 'toolkit',
      narration: [
        { say: 'The toolkit has boxes, circles, arrows, text, and code panels.', cue: 'kinds' },
        { say: 'Things can pop in, slide up, type out, or draw themselves.', cue: 'fx' },
        { say: 'And colors, positions, and sizes glide smoothly between keyframes.', cue: 'kf' },
      ],
      elements: [
        title('The toolkit'),
        { type: 'box', x: 120, y: 195, w: 110, h: 70, rx: 12, text: 'box', size: 20, fill: C.panel, stroke: C.brand, textColor: C.text,
          appear: { t: '@kinds+0.5', effect: 'pop' },
          keyframes: [{ t: '@kf+0.3', dur: 0.6, fill: C.orangeFill, stroke: C.orange, scale: 1.15 }] },
        { type: 'circle', cx: 420, cy: 230, r: 36, fill: C.blue, appear: { t: '@kinds+1', effect: 'pop' },
          keyframes: [{ t: '@kf+0.9', dur: 0.6, fill: C.green, r: 46 }] },
        { type: 'arrow', x1: 580, y1: 230, x2: 720, y2: 230, color: C.yellow, width: 4, appear: { t: '@kinds+1.6', effect: 'draw', dur: 0.4 },
          keyframes: [{ t: '@kf+1.5', dur: 0.6, color: C.red }] },
        { type: 'text', text: 'Aa', x: 900, y: 248, size: 52, bold: true, align: 'center', appear: { t: '@kinds+2.1', effect: 'pop' },
          keyframes: [{ t: '@kf+2.1', dur: 0.6, fill: C.violet }] },
        { type: 'code', x: 1060, y: 205, w: 160, size: 17, lines: ['let x = 1;', 'x += 1;'], appear: { t: '@kinds+2.8', effect: 'fade' } },
        ...[['box', 175], ['circle', 420], ['arrow', 650], ['text', 900], ['code', 1110]].map(([l, x], i) => ({
          type: 'text', text: l, x, y: 320, size: 18, fill: C.dim, align: 'center', appear: { t: `@kinds+${0.5 + i * 0.6}`, effect: 'fade' } })),
        { type: 'line', x1: 80, y1: 365, x2: 1200, y2: 365, stroke: C.line, strokeWidth: 2, appear: { t: '@fx', effect: 'draw', dur: 0.5 } },
        { type: 'box', x: 160, y: 420, w: 120, h: 60, rx: 10, text: 'pop', size: 20, fill: C.panel, stroke: C.green, textColor: C.text, appear: { t: '@fx+0.6', effect: 'pop' } },
        { type: 'box', x: 430, y: 420, w: 120, h: 60, rx: 10, text: 'up', size: 20, fill: C.panel, stroke: C.blue, textColor: C.text, appear: { t: '@fx+1.2', effect: 'up' } },
        { type: 'text', text: 'type out...', x: 760, y: 460, size: 26, mono: true, fill: C.yellow, align: 'center', appear: { t: '@fx+1.8', effect: 'type', dur: 0.8 } },
        { type: 'path', d: 'M 990 470 L 1030 425 L 1070 470 L 1110 425 L 1150 470', stroke: C.orange, strokeWidth: 4, fill: 'none',
          appear: { t: '@fx+2.4', effect: 'draw', dur: 0.8 } },
        ...[['pop', 220], ['slide up', 490], ['type', 760], ['draw', 1070]].map(([l, x]) => ({
          type: 'text', text: l, x, y: 530, size: 18, fill: C.dim, align: 'center', appear: { t: '@fx+0.4', effect: 'fade' } })),
      ],
    },
    {
      name: 'workflow',
      narration: [
        { say: 'To check its own work, the agent runs timeline, which prints when every line is spoken.', cue: 'tl' },
        { say: 'And stills, which saves preview frames, so the layout is right before the full render.', cue: 'st' },
        { say: 'Speech is cached, so visual changes re-render in seconds.', cue: 'cache' },
        { say: 'And with no Kokoro, it falls back to the system voice, and still makes the video.', cue: 'fb' },
      ],
      elements: [
        title('How the agent checks its work'),
        { type: 'code', x: 80, y: 160, w: 580, size: 17, lineHeight: 1.6,
          lines: [
            { text: '$ node render.js tour.js --timeline', color: C.green },
            'Scene 1 "intro": 0.00 s, lasts 13.4 s',
            '  @meta  0.40-4.25  "This is vector..."',
            '  @ask   4.55-6.68  "You describe the..."',
            '',
            { text: '$ node render.js tour.js --stills 2@4', color: C.green },
            'Saved tour-stills/still-14_20s.png',
          ],
          appear: { t: '@tl', effect: 'fade' }, reveal: 0,
          keyframes: [{ t: '@tl+0.3', dur: 1.4, reveal: 4 / 7, ease: 'linear' }, { t: '@st+0.3', dur: 0.8, reveal: 1, ease: 'linear' }] },
        card(720, 150, 480, 90, '--timeline', 'when each line is spoken', C.green, '@tl+0.4'),
        card(720, 255, 480, 90, '--stills', 'preview frames as PNG', C.blue, '@st+0.4'),
        card(720, 360, 480, 90, 'speech cache', 'visual edits re-render fast', C.violet, '@cache+0.4'),
        card(720, 465, 480, 90, 'fallback voice', 'system voice if Kokoro is missing', C.orange, '@fb+0.4'),
      ],
    },
    {
      name: 'outro',
      narration: [
        { say: 'One request. One script. One video.', cue: 'one' },
        { say: "It's free and open source, on GitHub.", cue: 'gh' },
      ],
      elements: [
        { type: 'box', x: 180, y: 250, w: 220, h: 80, rx: 16, text: 'request', size: 28, fill: C.panel, stroke: C.blue, textColor: C.text, appear: { t: '@one', effect: 'pop' } },
        { type: 'arrow', x1: 415, y1: 290, x2: 520, y2: 290, color: C.dim, width: 4, appear: { t: '@one+0.7', effect: 'draw', dur: 0.3 } },
        { type: 'box', x: 530, y: 250, w: 220, h: 80, rx: 16, text: 'script', size: 28, fill: C.panel, stroke: C.violet, textColor: C.text, appear: { t: '@one+0.8', effect: 'pop' } },
        { type: 'arrow', x1: 765, y1: 290, x2: 870, y2: 290, color: C.dim, width: 4, appear: { t: '@one+1.5', effect: 'draw', dur: 0.3 } },
        { type: 'box', x: 880, y: 250, w: 220, h: 80, rx: 16, text: 'video', size: 28, fill: C.greenFill, stroke: C.green, textColor: C.text, appear: { t: '@one+1.6', effect: 'pop' } },
        { type: 'box', x: 340, y: 420, w: 600, h: 64, rx: 32, text: 'github.com/gsush701-gif/vector-video', size: 24, mono: true,
          fill: C.brandFill, stroke: C.brand, textColor: C.text, appear: { t: '@gh', effect: 'pop' } },
      ],
    },
  ],
  };
};
