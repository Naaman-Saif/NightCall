import { settings } from '../config/settings';
import { setShopFlag } from '../production/shop-flag';

try {
  const outcome = setShopFlag(process.argv.slice(2), settings.flagdConfigPath);
  console.log(JSON.stringify({ ...outcome, file: settings.flagdConfigPath }));
} catch (error: unknown) {
  console.error(`set-shop-flag refused: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
