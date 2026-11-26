// Demo: LeetCode 28 (strStr) - the "count outside the loop" bug, and the fix.
// Render with:  node scripts/render.js examples/strstr.js strstr.mp4
const C = {
  box: '#1e293b', boxS: '#94a3b8',
  good: '#14532d', goodS: '#22c55e',
  bad: '#7f1d1d', badS: '#ef4444',
  text: '#e2e8f0', dim: '#94a3b8', yellow: '#facc15', orange: '#fb923c', green: '#4ade80', red: '#f87171',
};
const BOX = 90, STEP = 110;

const look = (kind) => ({
  fill: kind === 'good' ? C.good : kind === 'bad' ? C.bad : C.box,
  stroke: kind === 'good' ? C.goodS : kind === 'bad' ? C.badS : C.boxS,
});
const paint = (t, kind) => Object.assign({ t, dur: 0.25 }, look(kind));
const letter = (ch, x, y, keyframes = [], extra = {}) =>
  Object.assign({ type: 'box', text: ch, x, y, w: BOX, h: BOX, size: 46, mono: true }, look('plain'), { keyframes }, extra);
const at = (cue, off) => (off ? `${cue}${off > 0 ? '+' : '-'}${Math.abs(off)}` : cue);
// Change a text value and give it a little "bump" so the eye notices.
const setText = (t, text, color) => [
  Object.assign({ t, dur: 0, text }, color ? { fill: color } : {}),
  { t, dur: 0.12, scale: 1.25, ease: 'out' },
  { t: at(t, 0.12), dur: 0.25, scale: 1 },
];

const BUGGY = [
  'int strStr(string haystack, string needle) {',
  '    int n = haystack.size(), m = needle.size();',
  { text: '    int count = 0;         // outside the loop!', color: C.red },
  '    for (int i = 0; i + m <= n; i++) {',
  '        for (int j = 0; j < m; j++) {',
  '            if (haystack[i+j] == needle[j]) count++;',
  '            else break;',
  '        }',
  '        if (count == m) return i;',
  '    }',
  '    return -1;',
  '}',
];
const FIXED = [
  'int strStr(string haystack, string needle) {',
  '    int n = haystack.size(), m = needle.size();',
  '    for (int i = 0; i + m <= n; i++) {',
  { text: '        int count = 0;     // reset for every i', color: C.green },
  '        for (int j = 0; j < m; j++) {',
  '            if (haystack[i+j] == needle[j]) count++;',
  '            else break;',
  '        }',
  '        if (count == m) return i;',
  '    }',
  '    return -1;',
  '}',
];

// Right-hand "board": haystack, sliding needle, i and count.
const HX = 790, HY = 165, NY = 335;
function board({ hayKf = [[], [], []], needleX = [], needleKf = [[], []], iKf = [], countKf = [], resultKf = [], extra = [] }) {
  return [
    { type: 'text', text: 'haystack', x: HX, y: HY - 18, size: 22, fill: C.dim },
    ...'aab'.split('').map((ch, k) => letter(ch, HX + k * STEP, HY, hayKf[k])),
    ...[0, 1, 2].map((k) => ({ type: 'text', text: String(k), x: HX + k * STEP + BOX / 2, y: HY + BOX + 26, size: 20, align: 'center', fill: C.dim })),
    { type: 'text', text: 'needle', x: HX, y: NY - 18, size: 22, fill: C.dim },
    { type: 'group', x: 0, keyframes: needleX, children: 'ab'.split('').map((ch, k) => letter(ch, HX + k * STEP, NY, needleKf[k])) },
    { type: 'text', text: '', x: HX, y: 490, size: 32, fill: C.text, keyframes: iKf },
    { type: 'text', text: 'count = 0', x: HX, y: 548, size: 40, bold: true, fill: C.yellow, origin: [HX + 90, 535], keyframes: countKf },
    { type: 'text', text: '', x: HX, y: 606, size: 30, bold: true, fill: C.text, keyframes: resultKf },
    ...extra,
  ];
}

module.exports = {
  width: 1280, height: 720, fps: 30,
  background: '#0f172a',
  voice: 'Microsoft Zira Desktop', rate: 2,
  leadIn: 0.3, gap: 0.2, tail: 0.5,
  captions: { size: 24 },
  scenes: [
    // 1. What the problem asks
    {
      name: 'intro', minDuration: 8.5,
      narration: [
        'LeetCode 28: find where the needle first shows up in the haystack.',
        { say: 'Here it starts at index 1.', cue: 'answer' },
      ],
      elements: [
        { type: 'text', text: 'LeetCode 28 · strStr', x: 640, y: 110, size: 54, bold: true, align: 'center', appear: { t: 0.2, effect: 'up' } },
        { type: 'text', text: 'Find the first index where needle appears in haystack', x: 640, y: 160, size: 26, fill: C.dim, align: 'center', appear: { t: 0.6 } },
        { type: 'text', text: 'haystack', x: 455, y: 315, size: 26, fill: C.dim, align: 'right', appear: { t: 1 } },
        ...'aab'.split('').map((ch, k) => letter(ch, 475 + k * STEP, 260, [], { appear: { t: 1 + k * 0.15, effect: 'pop' } })),
        ...[0, 1, 2].map((k) => ({ type: 'text', text: String(k), x: 475 + k * STEP + BOX / 2, y: 378, size: 20, fill: C.dim, align: 'center', appear: { t: 1.5 } })),
        { type: 'text', text: 'needle', x: 455, y: 455, size: 26, fill: C.dim, align: 'right', appear: { t: 2 } },
        {
          type: 'group', x: -110, appear: { t: 2 }, keyframes: [{ t: '@answer', dur: 0.8, x: 0 }],
          children: 'ab'.split('').map((ch, k) => letter(ch, 585 + k * STEP, 400, [paint(at('@answer', 0.8), 'good')])),
        },
        { type: 'arrow', x1: 630, y1: 520, x2: 630, y2: 395, color: C.green, width: 4, appear: { t: at('@answer', 1), effect: 'draw', dur: 0.5 } },
        { type: 'text', text: 'answer = 1', x: 640, y: 570, size: 40, bold: true, fill: C.green, align: 'center', appear: { t: at('@answer', 1.3), effect: 'pop' } },
      ],
    },

    // 2. The buggy code, step by step
    {
      name: 'bug',
      narration: [
        { say: 'In this buggy code, count starts outside the loop.', cue: 'code' },
        { say: 'At i equals 0, the first letters match. count is 1.', cue: 'i0' },
        { say: "The next ones don't. Stop.", cue: 'miss' },
        { say: 'At i equals 1, count is still 1. It was never reset!', cue: 'i1' },
        { say: 'Match. count is 2.', cue: 'm1' },
        { say: 'Match. count is 3.', cue: 'm2' },
        { say: '3 is not 2, so it returns minus 1. Wrong!', cue: 'wrong' },
      ],
      elements: [
        { type: 'text', text: 'The bug: count lives outside the loop', x: 40, y: 56, size: 32, bold: true, fill: C.red, appear: { t: 0.1 } },
        {
          type: 'code', x: 56, y: 100, size: 19, lineHeight: 1.5, w: 680, lines: BUGGY, appear: { t: 0.2 },
          highlight: 2,
          keyframes: [
            { t: '@i0', dur: 0.3, highlight: 3 }, { t: at('@i0', 1.6), dur: 0.3, highlight: 5 },
            { t: '@miss', dur: 0.3, highlight: 6 },
            { t: '@i1', dur: 0.3, highlight: 3 }, { t: at('@i1', 1.6), dur: 0.3, highlight: 2 },
            { t: '@m1', dur: 0.3, highlight: 5 },
            { t: '@wrong', dur: 0.3, highlight: 8 }, { t: at('@wrong', 2.2), dur: 0.3, highlight: 10 },
          ],
        },
        { type: 'text', text: 'count is never set back to 0!', x: 56, y: 530, size: 28, bold: true, fill: C.orange, appear: { t: at('@i1', 2.6), effect: 'pop' } },
        { type: 'text', text: '3 ≠ 2  →  match missed', x: 56, y: 590, size: 28, bold: true, fill: C.red, appear: { t: at('@wrong', 0.3), effect: 'pop' } },
        ...board({
          hayKf: [
            [paint(at('@i0', 1.6), 'good'), paint('@i1', 'plain')],
            [paint('@miss', 'bad'), paint('@i1', 'plain'), paint('@m1', 'good')],
            [paint('@m2', 'good')],
          ],
          needleX: [{ t: at('@i1', 0.6), dur: 0.8, x: STEP }],
          needleKf: [
            [paint(at('@i0', 1.6), 'good'), paint('@i1', 'plain'), paint('@m1', 'good')],
            [paint('@miss', 'bad'), paint('@i1', 'plain'), paint('@m2', 'good')],
          ],
          iKf: [{ t: '@i0', dur: 0, text: 'i = 0' }, ...setText(at('@i1', 0.3), 'i = 1')],
          countKf: [
            ...setText(at('@i0', 2.9), 'count = 1'),
            { t: at('@i1', 1.6), dur: 0.2, fill: C.orange },
            { t: at('@i1', 1.6), dur: 0.15, scale: 1.3 }, { t: at('@i1', 1.9), dur: 0.3, scale: 1 },
            ...setText('@m1', 'count = 2'),
            ...setText('@m2', 'count = 3'),
            { t: '@wrong', dur: 0.2, fill: C.red },
          ],
          resultKf: [{ t: at('@wrong', 2.2), dur: 0, text: 'returns -1  ✗', fill: C.red }, { t: at('@wrong', 2.2), dur: 0.12, scale: 1.2 }, { t: at('@wrong', 2.35), dur: 0.25, scale: 1 }],
        }),
      ],
    },

    // 3. The fix
    {
      name: 'fix',
      narration: [
        { say: 'The fix: put count inside the loop, so it resets each time.', cue: 'code' },
        { say: 'Now at i equals 1, count goes 1, then 2.', cue: 'i1' },
        { say: '2 equals 2. Return 1. Correct!', cue: 'ok' },
        { say: 'Tip: reset your counter for each new try.', cue: 'tip' },
      ],
      elements: [
        { type: 'text', text: 'The fix: reset count for every i', x: 40, y: 56, size: 32, bold: true, fill: C.green, appear: { t: 0.1 } },
        {
          type: 'code', x: 56, y: 100, size: 19, lineHeight: 1.5, w: 680, lines: FIXED, appear: { t: 0.2 },
          highlight: 3, highlightColor: '#22c55e',
          keyframes: [{ t: '@i1', dur: 0.3, highlight: 5 }, { t: '@ok', dur: 0.3, highlight: 8 }],
        },
        {
          type: 'group', appear: { t: '@tip', effect: 'up' }, children: [
            { type: 'rect', x: 40, y: 500, w: 660, h: 110, rx: 14, fill: '#1e3a8a', stroke: '#60a5fa', strokeWidth: 2 },
            { type: 'text', text: 'Tip: reset your counter\nfor every new starting point.', x: 66, y: 543, size: 28, bold: true, fill: '#dbeafe' },
          ],
        },
        ...board({
          hayKf: [[], [paint(at('@i1', 1.5), 'good')], [paint(at('@i1', 2.5), 'good')]],
          needleX: [{ t: at('@i1', 0.1), dur: 0.8, x: STEP }],
          needleKf: [[paint(at('@i1', 1.5), 'good')], [paint(at('@i1', 2.5), 'good')]],
          iKf: [{ t: '@code', dur: 0, text: 'i = 0' }, ...setText(at('@i1', 0.1), 'i = 1')],
          countKf: [
            ...setText(at('@i1', 0.4), 'count = 0'),
            ...setText(at('@i1', 1.5), 'count = 1'),
            ...setText(at('@i1', 2.5), 'count = 2'),
            { t: '@ok', dur: 0.2, fill: C.green },
          ],
          resultKf: [{ t: at('@ok', 1.4), dur: 0, text: 'returns 1  ✓', fill: C.green }, { t: at('@ok', 1.4), dur: 0.12, scale: 1.2 }, { t: at('@ok', 1.55), dur: 0.25, scale: 1 }],
        }),
      ],
    },
  ],
};
