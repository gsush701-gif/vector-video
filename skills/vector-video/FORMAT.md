# Scene file format

A scene file is JSON, or a JS module that exports the same object (or a function that returns it).

```js
module.exports = {
  width: 1280, height: 720, fps: 30,      // defaults shown
  background: '#0f172a',                  // any CSS color
  color: '#e2e8f0',                       // default text color
  font: 'Segoe UI', mono: 'Consolas',     // font families (Windows fonts are loaded automatically)
  fonts: [],                              // extra .ttf/.otf files to load
  voice: 'Microsoft Zira Desktop',        // optional; system default if left out
  rate: 1,                                // speech speed, -10 .. 10
  leadIn: 0.4, gap: 0.3, tail: 0.7,       // silence before first line, between lines, after last line (s)
  fade: 0.25,                             // fade in/out of each scene (s); 0 = hard cut
  captions: true,                         // or { size, color, background, backgroundOpacity, y }
  overlay: [],                            // elements drawn on top of every scene (times = whole video)
  scenes: [ /* scene objects */ ],
};
```

## Scene

```js
{
  name: 'intro',                 // optional, shown in the timing table
  narration: [                   // a string, or a list of lines
    'First sentence.',
    { say: 'Second sentence.', cue: 'second' },   // cue = a name you can animate on
    { pause: 1.0 },                               // extra silence
    { say: 'Spoken text', caption: 'Shown text', pause: 0.5, voice: '...', rate: 0 },
  ],
  minDuration: 5,                // optional: never shorter than this
  duration: 8,                   // optional: wanted length (never cuts speech)
  background: '#000',            // optional per-scene override
  fade: 0, captions: false,      // optional per-scene overrides
  elements: [ /* elements, drawn in order (later = on top) */ ],
}
```

Scene length = speech length + gaps + tail (or `minDuration` / `duration` if longer).

## Times

Anywhere a time is expected (`t`, `appear`, `disappear`), you can use:

| Value | Meaning |
| --- | --- |
| `2.5` | 2.5 s after the scene starts |
| `"@0"`, `"@1"` | when narration line 0, 1 starts |
| `"@name"` | when the line with `cue: 'name'` starts |
| `"@name.end"` | when that line ends |
| `"@name+0.8"`, `"@name-0.2+0.1"` | offsets (they add up) |
| `"@end"`, `"@end-1"` | end of the scene |
| `"50%"` | halfway through the scene |

`end` is reserved; don't use it as a cue name.

## Animation

Every element can have:

- `appear: t` or `appear: { t, effect, dur, ease }` - starts hidden, then shows up.
  Effects: `fade` (default), `pop` (grows in), `up` (slides up), `type` (text types out letter by letter), `draw` (lines, arrows and paths draw themselves).
- `disappear: t` or `{ t, dur }` - fades out.
- `keyframes: [ { t, dur, ease, ...props } ]` - at time `t`, move each listed property from its current value to the new value over `dur` seconds (default 0.4; `dur: 0` = jump).
  Numbers and `#rrggbb` / `#rgb` colors move smoothly. Other values (like `text`) switch at `t`.
  `ease`: `inOut` (default), `in`, `out`, `linear`, `back` (overshoot).
- Common props on all elements: `opacity`, `dx`, `dy` (shift), `scale`, `rotate` (degrees), `origin: [x, y]` (center for scale/rotate; sensible default per type), `visible: false`.

## Element types

| type | props |
| --- | --- |
| `rect` | `x, y, w, h, rx, fill, stroke, strokeWidth, dash` |
| `circle` | `cx, cy, r, fill, stroke, strokeWidth` |
| `ellipse` | `cx, cy, rx, ry, fill, stroke` |
| `line` | `x1, y1, x2, y2, stroke` (or `color`), `strokeWidth`, `dash` (e.g. `"8 6"`), `cap`, `draw` (0..1) |
| `arrow` | `x1, y1, x2, y2, color, width, head` (head size), `draw` (0..1) |
| `path` | `d` (SVG path data), `fill`, `stroke`, `strokeWidth`, `draw` (0..1), `length` (optional) |
| `polygon` / `polyline` | `points: [[x,y], ...]`, `fill`, `stroke` |
| `text` | `text` (use `\n` for new lines), `x, y, size, fill` (or `color`), `bold`, `weight`, `italic`, `mono`, `font`, `align` (`left`/`center`/`right`), `valign` (`middle`/`top`; default is baseline), `lineHeight` (multiplier, e.g. `1.4`), `letterSpacing`, `reveal` (0..1 = part of the text shown) |
| `box` | a rounded box with centered text: `x, y, w, h, rx, text, size, fill, stroke, strokeWidth, textColor, mono, weight` (great for array cells and letters) |
| `code` | a code panel: `x, y, lines` (strings or `{ text, color, bold }`), `size, lineHeight` (a multiplier of `size`, e.g. `1.5`; not pixels), `w, color, panel` (false = no background), `panelColor`, `highlight` (line index, or a list; animate it to move the highlight bar), `highlightColor`, `highlightOpacity`, `reveal` (0..1 shows lines one by one) |
| `group` | `x, y` (moves all children), `children: [...]`; animate the group to move many things at once |
| `svg` | `svg`: raw SVG markup (vector only; `<image>`, `<use>`, `<foreignObject>` and links are refused), `x, y` |

## Example

```json
{
  "captions": true,
  "scenes": [{
    "narration": ["This box turns green.", { "say": "Then it moves.", "cue": "move" }],
    "elements": [
      { "type": "box", "text": "7", "x": 200, "y": 300, "w": 100, "h": 100, "fill": "#1e293b", "stroke": "#94a3b8",
        "appear": { "t": 0.3, "effect": "pop" },
        "keyframes": [
          { "t": "@0+1", "dur": 0.3, "fill": "#14532d", "stroke": "#22c55e" },
          { "t": "@move", "dur": 1, "dx": 600 }
        ] }
    ]
  }]
}
```

## Command line

```
node <SKILL_DIR>/scripts/render.js <scene.json|scene.js> [out.mp4] [options]
  --timeline         print timing of every scene and narration line, then stop
  --stills <list>    save PNG previews instead of the video: "12.5" (seconds) or "2@3.5" (scene 2, 3.5 s in)
  --stills-dir <dir> where previews go (default <out>-stills)
  --video            with --stills, also render the video
  --no-audio         no speech (lengths guessed from word count) - quick drafts
  --scale 0.5        render smaller, for fast drafts
```

Speech audio is cached in the system temp folder (`vector-video-cache`), so re-renders after visual changes are fast.
Set `FFMPEG_PATH` to use a different ffmpeg.
