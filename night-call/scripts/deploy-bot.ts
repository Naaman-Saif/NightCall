import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

import { readFlagdConfig, withFlagStates, writeFlagdConfig } from '../src/sandbox/flagd-file';

const [shopPath, flag, variant] = process.argv.slice(2);
if (!shopPath || !flag || !variant) {
  console.error('usage: npm run deploy-bot -- <astronomy-shop path> <flag> <variant>');
  process.exit(1);
}

const path = join(shopPath, 'src/flagd/demo.flagd.json');
const before = readFlagdConfig(path);
const previous = before.flags[flag]?.defaultVariant ?? 'absent';
writeFlagdConfig(path, withFlagStates(before, { [flag]: variant }));
const line = `${new Date().toISOString()} deploy-bot flag=${flag} ${previous} -> ${variant} author=release-automation`;
appendFileSync(join(shopPath, 'deploy-bot.log'), line + '\n');
console.log(line);
