import { describe, expect, it } from 'vitest';
import { alignEditedPassage, applyTranscriptEdits, transcriptPassages } from './transcript-edit.js';
import type { TranscriptResult, WordTimestamp } from '../models/index.js';

const words = (text: string) => text.split(' ').map((word, i) => ({ word, start: i, end: i + .8, speaker: 'speaker_0', confidence: .9 }));
const transcript = (text: string) => ({ words: words(text), transcript: text, duration: 60,
  segments: [], language: 'en', speakers: { num_speakers: 1, speakers: {} }, speaker_segments: [] } as TranscriptResult);
function checkTimes(result: WordTimestamp[], original: WordTimestamp[]) {
  expect(result.every((w, i) => w.start >= original[0].start && w.end <= original.at(-1)!.end && w.end >= w.start && (!i || w.start >= result[i - 1].end))).toBe(true);
}

describe('transcript editing', () => {
  it('corrects a word without changing other word timings or speaker labels', () => {
    const t = transcript('This zebra game looks great.');
    const edited = applyTranscriptEdits(t, [{ from: 0, to: 5, text: 'This Zelda game looks great.' }]);
    expect(edited.words[1]).toEqual({ ...t.words[1], word: 'Zelda' });
    expect(edited.words.slice(2)).toEqual(t.words.slice(2));
    expect(edited.transcript).toBe('This Zelda game looks great.');
    expect(edited.segments[0].text).toBe(edited.transcript);
    expect(t.transcript).toBe('This zebra game looks great.');
    expect(edited.duration).toBe(60);
  });
  it.each(['New This game is great.', 'This new game is great.', 'This game is great. Really',
    'This game rocks.', 'This great.', 'Completely rewritten passage'])('aligns additions and deletions locally: %s', text => {
    const original = words('This game is great.');
    const result = alignEditedPassage(original, text);
    expect(result.map(w => w.word).join(' ')).toBe(text);
    checkTimes(result, original);
  });
  it('retains timing after a deleted word and supports a split word', () => {
    const original = words('I use clipperz daily');
    const split = alignEditedPassage(original, 'I use Clipper Z daily');
    expect(split[0]).toEqual(original[0]);
    expect(split.at(-1)).toEqual(original.at(-1));
    expect(split[2].start).toBe(original[2].start);
    expect(split[3].end).toBe(original[2].end);
    expect(alignEditedPassage(original, 'I clipperz daily')[1]).toEqual(original[2]);
  });
  it('can remove one caption passage but cannot erase the entire transcript', () => {
    const t = transcript('One. Two.'); t.words[1].start = 5; t.words[1].end = 6;
    expect(transcriptPassages(t.words)).toHaveLength(2);
    expect(applyTranscriptEdits(t, [{ from: 0, to: 1, text: '' }]).words).toEqual([t.words[1]]);
    expect(() => applyTranscriptEdits(t, [{ from: 0, to: 1, text: '' }, { from: 1, to: 2, text: '' }])).toThrow('at least one word');
  });
  it('rejects overlapping edits and stale or oversized ranges', () => {
    const t = transcript('one two');
    expect(() => applyTranscriptEdits(t, [{ from: 0, to: 2, text: 'one' }, { from: 0, to: 2, text: 'two' }])).toThrow();
    expect(() => applyTranscriptEdits(t, [{ from: 0, to: 3, text: 'hello' }])).toThrow();
    expect(() => applyTranscriptEdits(t, [{ from: 0, to: 2, text: 'x '.repeat(201) }])).toThrow();
  });
});
