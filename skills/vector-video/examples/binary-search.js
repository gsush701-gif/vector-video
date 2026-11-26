// Binary search explainer: find 23 in a sorted list of 10 numbers.
// Render with:  node scripts/render.js examples/binary-search.js binary-search.mp4
const C = {
  box: '#1e293b', boxS: '#94a3b8', good: '#14532d', goodS: '#22c55e', mid: '#713f12', midS: '#facc15',
  text: '#e2e8f0', dim: '#94a3b8', yellow: '#facc15', blue: '#60a5fa', orange: '#fb923c', green: '#4ade80', red: '#f87171',
};
const NUMS = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
const BOX = 90, STEP = 104, X0 = 122, BY = 130;
const cx = (k) => X0 + k * STEP + BOX / 2;
const at = (cue, off) => (off ? `${cue}${off > 0 ? '+' : '-'}${Math.abs(off)}` : cue);
const look = (kind) => ({
  fill: kind === 'good' ? C.good : kind === 'mid' ? C.mid : C.box,
  stroke: kind === 'good' ? C.goodS : kind === 'mid' ? C.midS : C.boxS,
});
const paint = (t, kind) => Object.assign({ t, dur: 0.25 }, look(kind));
const setText = (t, text, fill) => [
  Object.assign({ t, dur: 0, text }, fill ? { fill } : {}),
  { t, dur: 0.12, scale: 1.2, ease: 'out' }, { t: at(t, 0.12), dur: 0.25, scale: 1 },
];

// The row of numbers with index labels. kf[k] = keyframes for box k.
function row(kf = {}, appear) {
  const out = [];
  NUMS.forEach((n, k) => {
    out.push(Object.assign({ type: 'box', text: String(n), x: X0 + k * STEP, y: BY, w: BOX, h: 80, size: 34, mono: true },
      look('plain'), { keyframes: kf[k] || [] }, appear ? { appear: { t: appear + k * 0.08, effect: 'pop' } } : {}));
    out.push({ type: 'text', text: String(k), x: cx(k), y: BY + 106, size: 18, fill: C.dim, align: 'center', keyframes: kf['i' + k] || [], ...(appear ? { appear: appear + 0.8 } : {}) });
  });
  return out;
}

// A pointer (arrow + label) that sits under (or over) an index and can slide.
function pointer(label, color, startIdx, moves, appear, above = false) {
  const x = cx(startIdx);
  const kids = above
    ? [{ type: 'text', text: label, x, y: BY - 44, size: 24, bold: true, fill: color, align: 'center' },
       { type: 'arrow', x1: x, y1: BY - 36, x2: x, y2: BY - 6, color, width: 4, head: 14 }]
    : [{ type: 'arrow', x1: x, y1: BY + 150, x2: x, y2: BY + 118, color, width: 4, head: 14 },
       { type: 'text', text: label, x, y: BY + 178, size: 24, bold: true, fill: color, align: 'center' }];
  return {
    type: 'group', x: 0, children: kids, appear: { t: appear, effect: 'fade' },
    keyframes: moves.map(([t, idx]) => ({ t, dur: 0.6, x: (idx - startIdx) * STEP })),
  };
}

const CODE = [
  'int search(vector<int>& nums, int target) {',
  '    int lo = 0, hi = nums.size() - 1;',
  '    while (lo <= hi) {',
  '        int mid = lo + (hi - lo) / 2;',
  '        if (nums[mid] == target) return mid;',
  '        if (nums[mid] < target) lo = mid + 1;',
  '        else hi = mid - 1;',
  '    }',
  '    return -1;',
  '}',
];

const fadeOut = (t) => [{ t, dur: 0.4, opacity: 0.22 }];

// Walkthrough timing: build keyframes for every box from the steps.
const boxKf = {};
const push = (k, frame) => { (boxKf[k] = boxKf[k] || []).push(frame); };
// step 1: mid = 4 (16)
push(4, paint('@m1+0.4', 'mid'));
// 16 < 23: throw away 0..4
for (let k = 0; k <= 4; k++) { push(k, ...fadeOut('@right+3')); (boxKf['i' + k] = boxKf['i' + k] || []).push(...fadeOut('@right+3')); }
push(4, paint('@right+3', 'plain'));
// step 2: mid = 7 (56)
push(7, paint('@m2+0.4', 'mid'));
// 56 > 23: throw away 7..9
for (let k = 7; k <= 9; k++) { push(k, ...fadeOut('@left+3')); (boxKf['i' + k] = boxKf['i' + k] || []).push(...fadeOut('@left+3')); }
push(7, paint('@left+3', 'plain'));
// step 3: mid = 5 (23) found
push(5, paint('@m3+0.4', 'mid'), paint('@found', 'good'), { t: '@found', dur: 0.15, scale: 1.2 }, { t: '@found+0.15', dur: 0.3, scale: 1 });

const RX = 760; // right-hand state panel

module.exports = {
  width: 1280, height: 720, fps: 30,
  background: '#0f172a',
  voice: 'Microsoft Zira Desktop', rate: 1,
  leadIn: 0.3, gap: 0.25, tail: 0.6,
  captions: { size: 24 },
  scenes: [
    // 1. What binary search is
    {
      name: 'intro', minDuration: 6,
      narration: [
        'Binary search finds a number in a sorted list, very fast.',
        { say: 'Here, we want to find 23.', cue: 'target' },
        { say: 'Checking every number one by one is slow. Instead, we look at the middle, and throw away the half that cannot have our number.', cue: 'idea' },
      ],
      elements: [
        { type: 'text', text: 'Binary Search', x: 640, y: 62, size: 52, bold: true, align: 'center', appear: { t: 0.1, effect: 'up' } },
        ...row({}, 0.6),
        { type: 'text', text: 'sorted: small → big', x: 640, y: 300, size: 24, fill: C.dim, align: 'center', appear: 1.8 },
        { type: 'text', text: 'target = 23', x: 640, y: 380, size: 44, bold: true, fill: C.yellow, align: 'center', appear: { t: '@target', effect: 'pop' } },
        { type: 'group', appear: { t: '@idea', effect: 'up' }, children: [
          { type: 'text', text: '1. Look at the middle', x: 380, y: 470, size: 30, fill: C.text },
          { type: 'text', text: '2. Too small? Go right.  Too big? Go left.', x: 380, y: 520, size: 30, fill: C.text },
          { type: 'text', text: '3. Throw away the other half', x: 380, y: 570, size: 30, fill: C.text },
        ] },
      ],
    },

    // 2. Step by step, with the code
    {
      name: 'walk',
      narration: [
        { say: 'lo starts at the first spot. hi starts at the last spot.', cue: 'start' },
        { say: 'The middle is index 4. The number there is 16.', cue: 'm1' },
        { say: '16 is smaller than 23. So 23 must be on the right. Move lo to 5.', cue: 'right' },
        { say: 'The new middle is index 7. The number there is 56.', cue: 'm2' },
        { say: '56 is bigger than 23. So 23 is on the left. Move hi to 6.', cue: 'left' },
        { say: 'The middle is now index 5. The number there is 23.', cue: 'm3' },
        { say: 'Found it! We return 5.', cue: 'found' },
      ],
      elements: [
        { type: 'text', text: 'Find 23', x: 40, y: 50, size: 30, bold: true, fill: C.yellow },
        ...row(boxKf),
        pointer('lo', C.blue, 0, [['@right+4.8', 5]], '@start'),
        pointer('hi', C.orange, 9, [['@left+4.8', 6]], '@start+1.2'),
        pointer('mid', C.yellow, 4, [['@m2', 7], ['@m3', 5]], '@m1', true),
        {
          type: 'code', x: 56, y: 352, size: 17, lineHeight: 1.4, w: 640, lines: CODE,
          highlight: 1,
          keyframes: [
            { t: '@m1', dur: 0.3, highlight: 3 },
            { t: '@right', dur: 0.3, highlight: 5 },
            { t: '@m2', dur: 0.3, highlight: 3 },
            { t: '@left', dur: 0.3, highlight: 6 },
            { t: '@m3', dur: 0.3, highlight: 3 },
            { t: '@found', dur: 0.3, highlight: 4 },
          ],
        },
        { type: 'text', text: 'lo = 0', x: RX, y: 380, size: 32, bold: true, fill: C.blue, keyframes: setText('@right+4.8', 'lo = 5') },
        { type: 'text', text: 'hi = 9', x: RX + 200, y: 380, size: 32, bold: true, fill: C.orange, appear: '@start+1.2', keyframes: setText('@left+4.8', 'hi = 6') },
        { type: 'text', text: 'mid = 4  →  16', x: RX, y: 440, size: 32, bold: true, fill: C.yellow, appear: '@m1+0.4',
          keyframes: [...setText('@m2+0.4', 'mid = 7  →  56'), ...setText('@m3+0.4', 'mid = 5  →  23')] },
        { type: 'text', text: '16 < 23  →  go right', x: RX, y: 510, size: 30, bold: true, fill: C.text, appear: '@right+0.3',
          keyframes: [
            { t: '@m2', dur: 0.2, opacity: 0 },
            { t: '@left+0.3', dur: 0, text: '56 > 23  →  go left' }, { t: '@left+0.3', dur: 0.3, opacity: 1 },
            { t: '@m3', dur: 0.2, opacity: 0 },
            { t: '@found', dur: 0, text: '23 == 23  →  found!', fill: C.green }, { t: '@found', dur: 0.3, opacity: 1 },
          ] },
        { type: 'text', text: 'return 5', x: RX, y: 580, size: 36, bold: true, fill: C.green, appear: { t: '@found+0.6', effect: 'pop' } },
      ],
    },

    // 3. Why it is fast
    {
      name: 'fast',
      narration: [
        { say: 'Each step cuts the list in half.', cue: 'half' },
        { say: '10 numbers took only 3 looks.', cue: 'three' },
        { say: 'Even a million numbers takes only about 20 looks.', cue: 'million' },
        { say: 'Just remember: the list must be sorted first.', cue: 'rule' },
      ],
      elements: [
        { type: 'text', text: 'Why is it fast?', x: 640, y: 70, size: 44, bold: true, align: 'center', appear: { t: 0.1, effect: 'up' } },
        ...[[10, 1000], [5, 500], [2, 200], [1, 100]].map(([n, w], i) => ({
          type: 'group', appear: { t: `@half+${(0.3 + i * 0.6).toFixed(1)}`, effect: 'up' }, children: [
            { type: 'rect', x: 640 - w / 2, y: 120 + i * 62, w, h: 44, rx: 8, fill: i === 3 ? C.good : '#1e3a8a', stroke: i === 3 ? C.goodS : C.blue, strokeWidth: 2 },
            { type: 'text', text: n === 1 ? '1 left → found' : `${n} left`, x: 640 + w / 2 + 16, y: 120 + i * 62 + 22, size: 22, valign: 'middle', fill: C.dim },
          ],
        })),
        { type: 'text', text: '10 numbers  →  3 looks', x: 640, y: 420, size: 36, bold: true, fill: C.yellow, align: 'center', appear: { t: '@three', effect: 'pop' } },
        { type: 'text', text: '1,000,000 numbers  →  about 20 looks', x: 640, y: 480, size: 36, bold: true, fill: C.green, align: 'center', appear: { t: '@million', effect: 'pop' } },
        { type: 'group', appear: { t: '@rule', effect: 'up' }, children: [
          { type: 'rect', x: 340, y: 520, w: 600, h: 70, rx: 14, fill: '#7c2d12', stroke: C.orange, strokeWidth: 2 },
          { type: 'text', text: 'The list must be sorted!', x: 640, y: 555, size: 30, bold: true, fill: '#ffedd5', align: 'center', valign: 'middle' },
        ] },
      ],
    },
  ],
};
