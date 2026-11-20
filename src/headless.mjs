import { readFileSync, openSync, writeSync, closeSync } from 'node:fs';
import { Game } from './core/game.mjs';
import { DataError, validateInputs } from './core/validate.mjs';

function parseArgs(args) {
  const options = {};
  const allowed = ['seed', 'night', 'scenario', 'inputs', 'ticks', 'out', 'snapshot-every'];
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i]?.slice(2);
    if (!args[i]?.startsWith('--') || !allowed.includes(name) || !args[i + 1] || name in options) throw new Error('Invalid command arguments');
    options[name] = args[i + 1];
  }
  for (const key of ['seed', 'night', 'ticks', 'out']) if (!(key in options)) throw new Error(`Missing --${key}`);
  for (const key of ['seed', 'night', 'ticks', 'snapshot-every']) {
    if (!(key in options)) continue;
    if (!/^-?\d+$/.test(options[key]) || !Number.isSafeInteger(Number(options[key]))) throw new Error(`Invalid --${key}`);
    options[key] = Number(options[key]);
  }
  if (![1,2,3].includes(options.night) || options.ticks < 0 || (options['snapshot-every'] ?? 10) < 1) throw new Error('Unsupported night or invalid tick count');
  return options;
}
function readData(path) {
  try { return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')); }
  catch (error) { throw new DataError(`${path}: ${error.message}`); }
}

let fd;
try {
  const args = parseArgs(process.argv.slice(2));
  const contract = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
  const scenario = args.scenario ? readData(args.scenario) : {};
  const inputs = args.inputs ? validateInputs(readData(args.inputs)) : { frames: [] };
  const game = new Game(contract.tuning, { seed: args.seed, night: args.night, scenario });
  fd = openSync(args.out, 'w');
  const write = obj => writeSync(fd, JSON.stringify(obj) + '\n');
  write(game.snapshot());
  let frameIndex = 0;
  const every = args['snapshot-every'] ?? 10;
  for (let k = 0; k < args.ticks && !['won','lost'].includes(game.state); k++) {
    const frame = inputs.frames[frameIndex]?.tick === k ? inputs.frames[frameIndex++] : {};
    const { tick, ...patch } = frame;
    for (const event of game.step(patch)) write(event);
    if (game.tick % every === 0) write(game.snapshot());
  }
  if (game.tick % every !== 0) write(game.snapshot());
  write(game.end());
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = error instanceof DataError ? 2 : 1;
} finally {
  if (fd !== undefined) closeSync(fd);
}
