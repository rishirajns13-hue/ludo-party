// Run with: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../doodle/logic.js');

test('exact guesses count, ignoring case, spaces and little words', () => {
  assert.equal(D.judge('Giraffe', 'giraffe'), 'correct');
  assert.equal(D.judge('  the GIRAFFE!! ', 'giraffe'), 'correct');
  assert.equal(D.judge('cat in tuxedo', 'a cat in a tuxedo'), 'correct');
});

test('a guess with all the key words counts, in any order', () => {
  assert.equal(D.judge('tuxedo cat', 'a cat in a tuxedo'), 'correct');
  assert.equal(D.judge('cats in tuxedos', 'a cat in a tuxedo'), 'correct');
});

test('one letter off is close, not correct', () => {
  assert.equal(D.judge('girafe', 'giraffe'), 'close');
  assert.equal(D.judge('banan', 'banana'), 'close');
});

test('half the key words is close', () => {
  assert.equal(D.judge('pineapple', 'angry pineapple'), 'close');
});

test('wrong is wrong', () => {
  assert.equal(D.judge('potato', 'giraffe'), 'wrong');
  assert.equal(D.judge('', 'giraffe'), 'empty');
  assert.equal(D.judge('cat', 'car'), 'wrong'); // short words need an exact match
});

test('the mask hides letters but keeps spaces and punctuation', () => {
  assert.equal(D.mask('ice cream', []), '___ _____');
  assert.equal(D.mask("dad's car", []), "___'_ ___");
  assert.equal(D.mask('ice cream', [0, 4]), 'i__ c____');
});

test('hint order only points at letters and is the same for the same word', () => {
  const order = D.hintOrder('ice cream');
  assert.ok(order.every((i) => /[a-z]/i.test('ice cream'[i])));
  assert.equal(new Set(order).size, 8);
  assert.deepEqual(order, D.hintOrder('ice cream'));
});

test('faster guesses score more, and the first one gets a bonus', () => {
  const slow = D.guessPoints(5000, 60000, false), fast = D.guessPoints(55000, 60000, false);
  assert.ok(fast > slow);
  assert.equal(D.guessPoints(30000, 60000, true) - D.guessPoints(30000, 60000, false), 20);
});

test('pickChoices skips used words and returns three different ones', () => {
  const words = ['a', 'b', 'c', 'd', 'e'];
  const picks = D.pickChoices(words, ['a', 'b'], 3, () => 0);
  assert.equal(picks.length, 3);
  assert.ok(!picks.includes('a') && !picks.includes('b'));
  assert.equal(new Set(picks).size, 3);
});

test('pickChoices starts over when every word was used', () => {
  assert.equal(D.pickChoices(['a', 'b'], ['a', 'b'], 3, () => 0).length, 2);
});

test('awards go to the right people', () => {
  const stats = {
    a: { fastest: 2400, fastestWord: 'banana', wrong: 1, drawPoints: 80, stumped: [], clutch: 0 },
    b: { fastest: 9000, fastestWord: 'moon', wrong: 7, drawPoints: 40, stumped: ['angry pineapple'], clutch: 1 },
  };
  const names = { a: 'Kunju', b: 'Ammu' };
  const byTitle = Object.fromEntries(D.awards(stats, names).map((x) => [x.title, x.who]));
  assert.equal(byTitle['Mind Reader'], 'Kunju');
  assert.equal(byTitle['Picasso'], 'Kunju');
  assert.equal(byTitle['Wild Guesser'], 'Ammu');
  assert.equal(byTitle['Modern Artist'], 'Ammu');
  assert.equal(byTitle['Clutch Master'], 'Ammu');
});
