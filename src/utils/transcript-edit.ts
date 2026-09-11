import type { TranscriptResult, WordTimestamp } from '../models/index.js';

export interface TranscriptPassage { from: number; to: number; start: number; end: number; text: string }
export interface TranscriptEdit { from: number; to: number; text: string }

/** Small editable passages keep timing changes local and make long transcripts usable. */
export function transcriptPassages(words: WordTimestamp[]): TranscriptPassage[] {
  const passages: TranscriptPassage[] = [];
  let from = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i], next = words[i + 1];
    if (!next || i - from >= 29 || next.speaker !== w.speaker || next.start - w.end > 1 ||
        (i - from >= 7 && /[.!?]$/.test(w.word.trim()))) {
      passages.push({ from, to: i + 1, start: words[from].start, end: w.end,
        text: words.slice(from, i + 1).map(x => x.word.trim()).join(' ') });
      from = i + 1;
    }
  }
  return passages;
}

function distribute(tokens: string[], originals: WordTimestamp[]): WordTimestamp[] {
  if (!tokens.length) return [];
  const start = originals[0].start, end = originals[originals.length - 1].end;
  // Unchanged anchors elsewhere keep their Whisper timing. Only this replaced
  // span is redistributed, including splits such as "clipper" -> "Clipper Z".
  const weights = tokens.map(t => Math.max(1, t.length));
  const total = weights.reduce((a, b) => a + b, 0);
  let elapsed = 0;
  return tokens.map((word, i) => {
    const a = start + (end - start) * elapsed / total;
    elapsed += weights[i];
    const b = start + (end - start) * elapsed / total;
    return { ...originals[Math.min(originals.length - 1, Math.floor(i * originals.length / tokens.length))],
      word, start: a, end: b };
  });
}

export function alignEditedPassage(originals: WordTimestamp[], text: string): WordTimestamp[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (!originals.length) throw new Error('This passage has no timed words.');
  if (tokens.length > 200) throw new Error('Keep each edited passage under 200 words.');
  const n = originals.length, m = tokens.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = originals[i].word.trim() === tokens[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const anchors: [number, number][] = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (originals[i].word.trim() === tokens[j]) { anchors.push([i++, j++]); }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  anchors.push([n, m]);
  const result: WordTimestamp[] = [];
  let oldPos = 0, newPos = 0;
  for (const [oldAnchor, newAnchor] of anchors) {
    const added = tokens.slice(newPos, newAnchor);
    const replaced = originals.slice(oldPos, oldAnchor);
    let consumedAnchor = false;
    if (added.length && !replaced.length) {
      if (oldAnchor < n) {
        // An insertion with no original word interval shares the next word's
        // interval; this avoids borrowing an unrelated long silence.
        result.push(...distribute([...added, tokens[newAnchor]], [originals[oldAnchor]]));
        consumedAnchor = true;
      } else {
        const last = result.pop();
        if (last) result.push(...distribute([last.word.trim(), ...added], [last]));
      }
    } else if (replaced.length) result.push(...distribute(added, replaced));
    if (oldAnchor < n && !consumedAnchor) result.push({ ...originals[oldAnchor], word: tokens[newAnchor] });
    oldPos = oldAnchor + 1; newPos = newAnchor + 1;
  }
  return result;
}

export function applyTranscriptEdits<T extends TranscriptResult>(transcript: T, edits: TranscriptEdit[]): T {
  if (!Array.isArray(edits) || edits.length > 10000) throw new Error('Invalid transcript edits.');
  const passages = transcriptPassages(transcript.words);
  const boundaries = new Set(passages.map(p => `${p.from}:${p.to}`));
  let cursor = 0;
  const words: WordTimestamp[] = [];
  for (const edit of [...edits].sort((a, b) => a.from - b.from)) {
    if (!Number.isInteger(edit.from) || !Number.isInteger(edit.to) || edit.from < cursor ||
        !boundaries.has(`${edit.from}:${edit.to}`) || typeof edit.text !== 'string' || edit.text.length > 5000)
      throw new Error('Transcript passages changed. Reopen the editor and try again.');
    words.push(...transcript.words.slice(cursor, edit.from), ...alignEditedPassage(transcript.words.slice(edit.from, edit.to), edit.text));
    cursor = edit.to;
  }
  words.push(...transcript.words.slice(cursor));
  if (!words.some(w => w.word.trim())) throw new Error('Keep at least one word in the transcript.');
  return { ...transcript, words, transcript: words.map(w => w.word.trim()).join(' '),
    segments: transcriptPassages(words).map((p, id) => ({ id, start: p.start, end: p.end, text: p.text, speaker: words[p.from].speaker })) };
}
