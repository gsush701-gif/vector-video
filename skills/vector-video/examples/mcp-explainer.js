// MCP (Model Context Protocol) explainer: narrated vector video.
// Render with:  node scripts/render.js examples/mcp-explainer.js mcp-explainer.mp4

const C = {
  text: '#e2e8f0', dim: '#94a3b8', panel: '#1e293b', line: '#334155',
  brand: '#818cf8', violet: '#a78bfa', green: '#22c55e', greenFill: '#14532d',
  red: '#ef4444', redFill: '#7f1d1d', yellow: '#facc15', blue: '#60a5fa', orange: '#fb923c',
};

const MCP = { say: 'M C P', cap: 'MCP' };

function title(text, t = 0.2) {
  return { type: 'text', text, x: 640, y: 80, size: 38, bold: true, align: 'center', appear: { t, effect: 'up' } };
}

function node(x, y, w, h, text, color, t, extra = {}) {
  return {
    type: 'box', x, y, w, h, rx: 12, text, size: 20, fill: C.panel, stroke: color, strokeWidth: 2.5,
    textColor: C.text, appear: { t, effect: 'pop' }, ...extra,
  };
}

// ---------- scene 1 + 2: apps and tools ----------
const apps = ['Claude', 'IDE', 'Chat app'];
const tools = ['GitHub', 'Slack', 'Database', 'Calendar'];
const appY = (i) => 190 + i * 130;   // centers 215, 345, 475 (box h 50)
const toolY = (i) => 165 + i * 105;  // centers 190, 295, 400, 505

function appNodes(t) { return apps.map((a, i) => node(90, appY(i), 190, 50, a, C.brand, t + i * 0.15)); }
function toolNodes(t) { return tools.map((a, i) => node(1000, toolY(i), 190, 50, a, C.orange, t + i * 0.15)); }

function tangle(t, fadeAt) {
  const out = [];
  let k = 0;
  apps.forEach((_, i) => tools.forEach((_, j) => {
    out.push({
      type: 'line', x1: 280, y1: appY(i) + 25, x2: 1000, y2: toolY(j) + 25, stroke: C.red, strokeWidth: 2,
      appear: { t: `${t}+${(k++ * 0.12).toFixed(2)}`, effect: 'draw', dur: 0.4 },
      ...(fadeAt ? { disappear: fadeAt } : {}),
    });
  }));
  return out;
}

// ---------- scene 4: sequence diagram ----------
const lanes = [
  { x: 160, label: 'You', color: C.text },
  { x: 480, label: 'Host + model', color: C.brand },
  { x: 800, label: 'MCP server', color: C.violet },
  { x: 1120, label: 'Calendar', color: C.orange },
];

function laneEls() {
  const out = [];
  lanes.forEach((l, i) => {
    out.push(node(l.x - 95, 120, 190, 46, l.label, l.color, 0.2 + i * 0.12));
    out.push({ type: 'line', x1: l.x, y1: 172, x2: l.x, y2: 595, stroke: C.line, strokeWidth: 2, dash: '6 6',
      appear: { t: 0.5, effect: 'draw', dur: 0.6 } });
  });
  return out;
}

function msg(from, to, y, label, t, color = C.blue) {
  const a = lanes[from].x, b = lanes[to].x;
  const dir = b > a ? 1 : -1;
  return [
    { type: 'arrow', x1: a + 8 * dir, y1: y, x2: b - 8 * dir, y2: y, color, width: 3, head: 12,
      appear: { t, effect: 'draw', dur: 0.5 } },
    { type: 'text', text: label, x: (a + b) / 2, y: y - 10, size: 17, fill: color, align: 'center', mono: true,
      appear: { t: `${t}+0.2`, effect: 'fade' } },
  ];
}

module.exports = {
  voice: 'af_heart',
  rate: 1,
  captions: true,
  scenes: [
    {
      name: 'problem',
      narration: [
        { say: 'AI apps get much more useful when they can reach your tools.', cue: 'reach' },
        { say: 'But every app needs its own custom connection to every tool.', cue: 'mess' },
        { say: '3 apps and 4 tools means 12 separate integrations.', cue: 'count' },
      ],
      elements: [
        title('The problem'),
        ...appNodes(0.4),
        ...toolNodes(0.8),
        ...tangle('@mess'),
        { type: 'box', x: 490, y: 560, w: 300, h: 50, rx: 25, text: '3 × 4 = 12 integrations', size: 22,
          fill: C.redFill, stroke: C.red, textColor: C.text, appear: { t: '@count', effect: 'pop' } },
      ],
    },
    {
      name: 'standard',
      narration: [
        { say: `${MCP.say} is one shared standard in the middle.`, caption: `${MCP.cap} is one shared standard in the middle.`, cue: 'hub' },
        { say: 'Think of it like a USB C port for AI.', caption: 'Think of it like a USB-C port for AI.', cue: 'usb' },
        { say: 'Each app and each tool connects once.', cue: 'once' },
        { say: 'Now it is 3 plus 4, just 7 connections.', cue: 'count' },
      ],
      elements: [
        title('Model Context Protocol'),
        ...appNodes(0.1),
        ...toolNodes(0.1),
        { type: 'box', x: 540, y: 295, w: 200, h: 100, rx: 18, text: 'MCP', size: 40, weight: 800,
          fill: '#312e81', stroke: C.violet, strokeWidth: 3, textColor: C.text, appear: { t: '@hub', effect: 'pop' } },
        { type: 'text', text: 'one standard plug', x: 640, y: 425, size: 18, fill: C.violet, align: 'center',
          appear: { t: '@usb', effect: 'fade' } },
        ...apps.map((_, i) => ({ type: 'line', x1: 280, y1: appY(i) + 25, x2: 540, y2: 345, stroke: C.green, strokeWidth: 3,
          appear: { t: `@once+${(i * 0.2).toFixed(1)}`, effect: 'draw', dur: 0.4 } })),
        ...tools.map((_, j) => ({ type: 'line', x1: 740, y1: 345, x2: 1000, y2: toolY(j) + 25, stroke: C.green, strokeWidth: 3,
          appear: { t: `@once+${(0.6 + j * 0.2).toFixed(1)}`, effect: 'draw', dur: 0.4 } })),
        { type: 'box', x: 490, y: 560, w: 300, h: 50, rx: 25, text: '3 + 4 = 7 connections', size: 22,
          fill: C.greenFill, stroke: C.green, textColor: C.text, appear: { t: '@count', effect: 'pop' } },
      ],
    },
    {
      name: 'parts',
      narration: [
        { say: 'There are 3 parts.', cue: 'three' },
        { say: 'The host is the AI app you use. Inside it runs an M C P client.', caption: 'The host is the AI app you use. Inside it runs an MCP client.', cue: 'host' },
        { say: 'The client talks to an M C P server, which wraps one tool or data source.', caption: 'The client talks to an MCP server, which wraps one tool or data source.', cue: 'server' },
        { say: 'A server can offer tools to call, resources to read, and prompt templates.', cue: 'offer' },
      ],
      elements: [
        title('How it fits together'),
        { type: 'rect', x: 70, y: 150, w: 380, h: 220, rx: 16, fill: '#111c33', stroke: C.brand, strokeWidth: 2.5,
          appear: { t: '@host', effect: 'pop' } },
        { type: 'text', text: 'Host  (AI app + model)', x: 92, y: 186, size: 20, bold: true, fill: C.brand, appear: { t: '@host', effect: 'fade' } },
        node(130, 260, 260, 60, 'MCP client', C.blue, '@host+1.5'),
        { type: 'arrow', x1: 400, y1: 290, x2: 560, y2: 290, color: C.text, width: 3, appear: { t: '@server', effect: 'draw', dur: 0.5 } },
        { type: 'arrow', x1: 560, y1: 310, x2: 400, y2: 310, color: C.dim, width: 2, appear: { t: '@server+0.4', effect: 'draw', dur: 0.5 } },
        node(570, 255, 260, 70, 'MCP server', C.violet, '@server+0.5'),
        { type: 'arrow', x1: 840, y1: 290, x2: 960, y2: 290, color: C.text, width: 3, appear: { t: '@server+1.8', effect: 'draw', dur: 0.4 } },
        node(970, 255, 230, 70, 'GitHub', C.orange, '@server+2.1'),
        { type: 'line', x1: 700, y1: 325, x2: 700, y2: 420, stroke: C.violet, strokeWidth: 2, dash: '6 5', appear: { t: '@offer', effect: 'draw', dur: 0.4 } },
        node(430, 430, 170, 56, 'Tools', C.green, '@offer+0.4'),
        node(615, 430, 170, 56, 'Resources', C.blue, '@offer+1.5'),
        node(800, 430, 170, 56, 'Prompts', C.yellow, '@offer+2.6'),
        { type: 'text', text: 'actions', x: 515, y: 520, size: 16, fill: C.dim, align: 'center', appear: { t: '@offer+0.6', effect: 'fade' } },
        { type: 'text', text: 'data to read', x: 700, y: 520, size: 16, fill: C.dim, align: 'center', appear: { t: '@offer+1.7', effect: 'fade' } },
        { type: 'text', text: 'templates', x: 885, y: 520, size: 16, fill: C.dim, align: 'center', appear: { t: '@offer+2.8', effect: 'fade' } },
      ],
    },
    {
      name: 'flow',
      narration: [
        { say: 'Here is one request.', cue: 'start' },
        { say: 'You ask what is on your calendar today.', cue: 'ask' },
        { say: 'The host asks the server which tools it has.', cue: 'list' },
        { say: 'The model picks get events, and the host calls it.', caption: 'The model picks get_events, and the host calls it.', cue: 'call' },
        { say: 'The server queries the calendar and returns the result.', cue: 'fetch' },
        { say: 'The model reads it and answers you.', cue: 'answer' },
      ],
      elements: [
        ...laneEls(),
        ...msg(0, 1, 210, '"What\'s on today?"', '@ask', C.text),
        ...msg(1, 2, 262, 'tools/list', '@list'),
        ...msg(2, 1, 314, 'get_events, ...', '@list+1.2', C.violet),
        ...msg(1, 2, 366, 'tools/call get_events', '@call+1.2'),
        ...msg(2, 3, 418, 'query today', '@fetch', C.orange),
        ...msg(3, 2, 470, '3 events', '@fetch+0.9', C.orange),
        ...msg(2, 1, 522, 'result', '@fetch+1.8', C.violet),
        ...msg(1, 0, 574, '"You have 3 meetings."', '@answer', C.green),
      ],
    },
    {
      name: 'wire',
      narration: [
        { say: 'Under the hood, every message is plain JSON RPC.', caption: 'Under the hood, every message is plain JSON-RPC.', cue: 'json' },
        { say: 'A call names the tool and passes its arguments.', cue: 'args' },
        { say: 'Local servers run on your machine and talk over standard input and output.', cue: 'local' },
        { say: 'Remote servers run in the cloud and talk over H T T P.', caption: 'Remote servers run in the cloud and talk over HTTP.', cue: 'remote' },
      ],
      elements: [
        title('On the wire'),
        { type: 'code', x: 56, y: 150, w: 620, size: 20, lineHeight: 1.6,
          lines: [
            '{',
            '  "jsonrpc": "2.0",',
            '  "id": 7,',
            '  "method": "tools/call",',
            '  "params": {',
            '    "name": "get_events",',
            '    "arguments": { "day": "today" }',
            '  }',
            '}',
          ],
          appear: { t: '@json', effect: 'fade' },
          highlight: 1,
          keyframes: [
            { t: '@json+1.5', dur: 0, highlight: 3 },
            { t: '@args', dur: 0, highlight: 5 },
            { t: '@args+1.4', dur: 0, highlight: 6 },
          ] },
        { type: 'text', text: 'Transports', x: 760, y: 180, size: 24, bold: true, appear: { t: '@local', effect: 'fade' } },
        { type: 'rect', x: 760, y: 205, w: 460, h: 130, rx: 14, fill: C.panel, stroke: C.green, strokeWidth: 2.5,
          appear: { t: '@local', effect: 'pop' } },
        { type: 'text', text: 'stdio', x: 785, y: 248, size: 26, mono: true, fill: C.green, appear: { t: '@local', effect: 'fade' } },
        { type: 'text', text: 'server runs on your machine', x: 785, y: 290, size: 19, fill: C.dim, appear: { t: '@local+0.3', effect: 'fade' } },
        { type: 'rect', x: 760, y: 360, w: 460, h: 130, rx: 14, fill: C.panel, stroke: C.blue, strokeWidth: 2.5,
          appear: { t: '@remote', effect: 'pop' } },
        { type: 'text', text: 'HTTP', x: 785, y: 403, size: 26, mono: true, fill: C.blue, appear: { t: '@remote', effect: 'fade' } },
        { type: 'text', text: 'server runs remotely, in the cloud', x: 785, y: 445, size: 19, fill: C.dim, appear: { t: '@remote+0.3', effect: 'fade' } },
      ],
    },
    {
      name: 'outro',
      narration: [
        { say: 'Build a server once.', cue: 'build' },
        { say: 'Every M C P app can use it.', caption: 'Every MCP app can use it.', cue: 'every' },
        { say: 'That is the Model Context Protocol.', cue: 'end1' },
      ],
      elements: [
        node(520, 300, 240, 80, 'Your MCP server', C.violet, '@build', { size: 24 }),
        ...apps.map((a, i) => node(130 + i * 400 - (i === 1 ? 0 : 0), 140, 220, 56, a, C.brand, `@every+${(i * 0.3).toFixed(1)}`,
          { x: [150, 530, 910][i] })),
        ...[260, 640, 1020].map((x, i) => ({ type: 'arrow', x1: 640, y1: 300, x2: x, y2: 200, color: C.green, width: 3,
          appear: { t: `@every+${(0.2 + i * 0.3).toFixed(1)}`, effect: 'draw', dur: 0.4 } })),
        { type: 'text', text: 'Model Context Protocol', x: 640, y: 480, size: 40, bold: true, align: 'center',
          appear: { t: '@end1', effect: 'up' } },
        { type: 'text', text: 'one protocol · any app · any tool', x: 640, y: 530, size: 22, fill: C.dim, align: 'center',
          appear: { t: '@end1+0.6', effect: 'fade' } },
      ],
    },
  ],
};
