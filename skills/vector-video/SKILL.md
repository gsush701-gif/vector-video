---
name: vector-video
description: Make a real narrated video file (.mp4) where every visual is vector graphics drawn by code (SVG shapes, paths, text, code panels), with offline text-to-speech narration. Use when the user asks for a video, an animated explainer, a walkthrough video of an algorithm or bug, an animation, or an .mp4. No images, photos or downloads are used.
---

# Vector video

You can make real `.mp4` videos. You write a **scene file** (JSON or a JS module). A renderer draws every frame as SVG, turns the narration into speech with the computer's built-in voice, and joins it all into an `.mp4` with ffmpeg.

Every visual must be vector: shapes, lines, arrows, paths, text and code. Never use images, photos, `<image>` tags, or files from the internet.

## Where things are

`SKILL_DIR` = the folder this SKILL.md is in (the skill's base directory).

- Renderer: `<SKILL_DIR>/scripts/render.js`
- Full scene format: `<SKILL_DIR>/FORMAT.md` (read it before writing your first scene file)
- Worked examples: `<SKILL_DIR>/examples/strstr.js` (a LeetCode bug explainer), `<SKILL_DIR>/examples/binary-search.js` (an algorithm walkthrough), `<SKILL_DIR>/examples/hello.json` (tiny)

**First run:** if `<SKILL_DIR>/node_modules` is missing, run `npm install` inside `SKILL_DIR` once (needs Node 18+ and internet). It installs the SVG rasterizer, ffmpeg and the Kokoro neural voice (optional; ~830 MB of packages). Kokoro downloads its model once (~92 MB) on first use.

**Voice:** by default (`tts: 'auto'`) narration uses **Kokoro**, a natural-sounding neural voice that runs offline; set `voice: 'af_heart'` (or `am_michael`, `bf_emma`, ...). If Kokoro is not installed or its model cannot be downloaded, the renderer falls back to the system voice (Windows built-in voices, `say` on macOS, `espeak-ng` on Linux) and prints a warning; tell the user. If no speech engine exists at all, the video is made without a voice.

## Steps

1. **Plan the story.** 3 to 6 scenes. One idea per scene. Aim for 30 to 60 seconds unless the user asks for more.
2. **Write the scene file** in the user's working folder (or a folder they name), e.g. `video/explainer.js`. Prefer a `.js` file when there are repeated shapes (boxes in a row, array cells): build them with small helper functions, like the examples do. Use `module.exports = { ... }`.
3. **Check timing:** `node "<SKILL_DIR>/scripts/render.js" <scene file> <out.mp4> --timeline`. This speaks the narration and prints when each line starts and ends, so you can place animations on the right words.
4. **Preview stills** before the full render: `node "<SKILL_DIR>/scripts/render.js" <scene file> <out.mp4> --stills "1@2,2@5.5,3@4"` (`scene@seconds`, or plain seconds into the video). Open the PNGs and fix overlap, text running off screen, labels on top of each other, or wrong colors.
5. **Render:** `node "<SKILL_DIR>/scripts/render.js" <scene file> <out.mp4>`. About 1 second of work per second of video or less.
6. **Verify:** get ffprobe with `node -e "console.log(require('<SKILL_DIR>/node_modules/ffprobe-static').path)"`, then run `ffprobe -v error -show_entries format=duration:stream=codec_type -of compact <out.mp4>`. Expect one `video` and one `audio` stream. Optionally pull a frame with ffmpeg (`require('<SKILL_DIR>/node_modules/ffmpeg-static')` gives its path): `ffmpeg -ss 10 -i <out.mp4> -frames:v 1 frame.png`, and look at it.
7. Tell the user the full path of the `.mp4`. Delete the `<out>-stills` preview folder when done.

## Narration tips

- Narration drives the timing. Each scene lasts as long as its speech (plus a short tail). You never have to guess durations.
- Split a scene's narration into a list of short lines and give lines a `cue` name. Then animate at `"@cueName"`, `"@cueName+1.2"` or `"@cueName.end"`. This keeps pictures in sync with words. Check `--timeline` to see how long each line is, and place changes near the word that describes them.
- Use very simple, short sentences.
- Speech engines read a lone letter "a" as "uh". Say "the first letters match" instead of "a matches a". Write numbers as digits; write "-1" as "minus 1".
- Avoid code symbols in narration (`[i+j]`, `!=`, `++`). Say what they mean instead.
- Set `"captions": true` to show the narration as subtitles at the bottom (keep the bottom ~80 px free).
- Kokoro voices: `af_heart` (US female, the best), `am_michael` / `am_fenrir` (US male), `bf_emma` / `bm_george` (UK). `rate` goes from -10 to 10; 0 is natural for Kokoro. System voices on Windows are usually "Microsoft Zira Desktop", "Microsoft David Desktop" and "Microsoft Hazel Desktop" (used with `tts: 'system'`).
- Kokoro takes about 0.7 seconds per second of speech on a laptop CPU. Speech is cached, so re-renders after visual changes are fast.

## Layout tips

- Default canvas is 1280 x 720. Keep 40 px margins.
- Code walkthrough layout: either code on the left (x 56, font size 19, 12 lines fit) with a "board" on the right from x about 790, or an array row across the top with code bottom-left and state text bottom-right (see `examples/binary-search.js`).
- Pointers (lo, hi, mid, i, j): put them on different sides of the array (some above, some below) so labels never sit on top of each other.
- **Use a white background by default:** set `theme: 'light'` unless the user asks for a dark video. The theme sets the background, the default text color, box and code-panel colors, the highlight bar and the caption bar.
- Pick your own colors from the theme instead of hard-coding them: export a function, `module.exports = ({ palette: P }) => ({ theme: 'light', scenes: [...] })`, and use `P.text`, `P.dim`, `P.panel`, `P.line`, `P.green` / `P.greenFill`, `P.red` / `P.redFill`, `P.yellow`, `P.orange`, `P.blue`, `P.violet`, `P.brand` / `P.brandFill` (see `examples/plugin-tour.js`). Then `--theme dark` or `--theme light` re-colors the whole video.
- Light theme colors (white background): text `#0f172a`, dim `#475569`, panel `#f1f5f9`, lines `#cbd5e1`, match green `#16a34a` (fill `#dcfce7`), mismatch red `#dc2626` (fill `#fee2e2`), yellow `#ca8a04`, orange `#ea580c`, blue `#2563eb`. On white, use darker accent colors and pale fills; bright yellow text is hard to read.
- Dark theme colors (background `#0f172a`): text `#e2e8f0`, dim `#94a3b8`, match green `#22c55e` (fill `#14532d`), mismatch red `#ef4444` (fill `#7f1d1d`), highlight yellow `#facc15`, orange `#fb923c`, blue `#60a5fa`.
- Show state changes (a counter going up) with a text keyframe plus a small scale "bump" so the eye notices. Fade out parts that no longer matter (opacity about 0.2).
