// test/negative.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('a malformed file is rejected by its schema (CI guard works)', () => {
  let threw = false;
  try {
    execFileSync('npx', ['ajv', 'validate', '-s', 'schemas/metals.schema.json', '-d', 'test/fixtures/metals.invalid.json'],
      { stdio: 'pipe', shell: process.platform === 'win32' });
  } catch {
    threw = true; // ajv exits non-zero on invalid data
  }
  assert.ok(threw, 'ajv must reject the malformed fixture');
});
