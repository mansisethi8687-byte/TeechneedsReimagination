const { test } = require('node:test');
const assert = require('node:assert/strict');
const { latePenalty, gradeQuiz, updateStreak, DAY } = require('../services/scoring');
const { deriveProgramCode, generatePassword, verifyPassword } = require('../services/credentials');

test('late penalty is one point per full day late (upstream rule)', () => {
  const deadline = new Date('2026-01-10T00:00:00Z');
  assert.equal(latePenalty(deadline, new Date('2026-01-09T00:00:00Z')), 0);
  assert.equal(latePenalty(deadline, new Date('2026-01-10T23:00:00Z')), 0);
  assert.equal(latePenalty(deadline, new Date('2026-01-13T01:00:00Z')), 3);
});

test('quiz grading matches by id or index and scales to maxScore', () => {
  const quiz = { questions: [
    { _id: 'a', correctOptionIndex: 0, marks: 1 },
    { _id: 'b', correctOptionIndex: 1, marks: 3 },
  ] };
  const byId = gradeQuiz(quiz, [{ questionId: 'b', selectedOptionIndex: 1 }], 200);
  assert.deepEqual([byId.raw, byId.totalMarks, byId.score], [3, 4, 150]);
  const byIndex = gradeQuiz(quiz, [{ questionIndex: 0, selectedOptionIndex: 0 }], 200);
  assert.equal(byIndex.score, 50);
  assert.equal(gradeQuiz(quiz, [], undefined).score, 0);
});

test('streak continues on consecutive days and resets after a gap', () => {
  const m = { streak: 0 };
  const d0 = new Date('2026-03-01T10:00:00');
  updateStreak(m, d0);
  assert.equal(m.streak, 1);
  updateStreak(m, new Date(d0.getTime() + 2 * 3600 * 1000));
  assert.equal(m.streak, 1, 'same day does not increment');
  updateStreak(m, new Date(d0.getTime() + DAY));
  assert.equal(m.streak, 2);
  updateStreak(m, new Date(d0.getTime() + 4 * DAY));
  assert.equal(m.streak, 1);
});

test('program codes', () => {
  assert.equal(deriveProgramCode('Web Development'), 'WD');
  assert.equal(deriveProgramCode('Java'), 'JAVA');
  assert.equal(deriveProgramCode('Data Structures & Algorithms 2026'), 'DSA');
});

test('generated passwords avoid look-alike characters', () => {
  for (let i = 0; i < 200; i++) assert.doesNotMatch(generatePassword(), /[0O1lI]/);
});

test('verifyPassword handles bcrypt, legacy plaintext and garbage', async () => {
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('secret', 4);
  assert.deepEqual(await verifyPassword('secret', hash), { ok: true, legacy: false });
  assert.deepEqual(await verifyPassword('secret', 'secret'), { ok: true, legacy: true });
  assert.equal((await verifyPassword('nope', 'secret')).ok, false);
  assert.equal((await verifyPassword(undefined, hash)).ok, false);
});
