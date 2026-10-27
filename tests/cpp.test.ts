import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { example, optimized, seededInput, type Input } from '../src/algorithms';

const temporary = mkdtempSync(join(tmpdir(), 'batchlab-cpp-'));
const program = join(temporary, process.platform === 'win32' ? 'batchlab.exe' : 'batchlab');
const source = resolve(process.cwd(), 'cpp/batchlab.cpp');

function compilerEnvironment() {
  const env = { ...process.env };
  if (process.platform === 'win32') {
    // MinGW child programs need their DLL directory in PATH as well.
    try {
      const compiler = execFileSync('where.exe', ['g++'], { encoding: 'utf8' }).trim().split(/\r?\n/)[0];
      const directory = dirname(compiler);
      env.PATH = `${directory};${env.PATH ?? ''}`;
    } catch { /* The compilation step below reports an unavailable compiler. */ }
  }
  return env;
}

function cppCost(input: Input): bigint {
  const file = `${input.jobs.length}\n${input.S}\n${input.jobs.map(job => `${job.t} ${job.f}`).join('\n')}\n`;
  writeFileSync(join(temporary, 'input.txt'), file);
  execFileSync(program, { cwd: temporary, stdio: 'ignore', env: compilerEnvironment() });
  return BigInt(readFileSync(join(temporary, 'output.txt'), 'utf8').trim());
}

describe('C++ and browser algorithm consistency', () => {
  beforeAll(() => {
    execFileSync('g++', ['-std=c++17', '-O2', source, '-o', program], {
      env: compilerEnvironment(),
      stdio: 'pipe',
    });
  });

  afterAll(() => {
    for (const entry of readdirSync(temporary)) {
      const file = join(temporary, entry);
      if (existsSync(file)) unlinkSync(file);
    }
    rmdirSync(temporary);
  });

  it('matches the official sample and zero-valued ties', () => {
    expect(cppCost(example)).toBe(153n);
    const ties: Input = { S: 0, jobs: [{ t: 0, f: 0 }, { t: 0, f: 0 }, { t: 1, f: 1 }] };
    expect(cppCost(ties)).toBe(optimized(ties).cost);
  });

  it('matches 80 deterministic small cases', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const input = seededInput(seed, 1 + seed % 12, 8, 8, seed % 5);
      expect(cppCost(input)).toBe(optimized(input).cost);
    }
  });

  it('matches exact arithmetic near the supported C++ input limit', () => {
    const input = seededInput(20261027, 120, 10_000_000, 10_000_000, 10_000_000);
    expect(cppCost(input)).toBe(optimized(input, false).cost);
  });
});
