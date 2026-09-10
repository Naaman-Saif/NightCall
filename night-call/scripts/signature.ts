import { productionTarget, sandboxTarget } from '../src/config/targets';
import { ProbesService } from '../src/probes/probes.service';

const which = process.argv[2] ?? 'prod';
const target = which === 'clone' ? sandboxTarget() : productionTarget();

new ProbesService()
  .readAll(target)
  .then((readings) => {
    for (const r of readings) console.log(`${r.failing ? 'FAIL' : 'ok  '} ${r.name} = ${r.value}`);
    const failing = readings.filter((r) => r.failing).map((r) => r.name);
    console.log(failing.length === 0 ? '\nsignature: green' : `\nsignature: ${failing.join(', ')}`);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
