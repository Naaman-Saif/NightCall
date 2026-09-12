import json
import signal
import subprocess
import time

from common import PROJECT, ROOT, compose, now, production_identity, save
from evidence import collect, start_events, stop_events
from prepare import prepare
from study import cycle


def cleanup():
    args = ['docker', 'compose', '-p', PROJECT, '-f', str(ROOT / 'compose.json'), 'down', '--volumes', '--remove-orphans']
    result = subprocess.run(args, capture_output=True, text=True, timeout=120)
    save('cleanup.json', {'returncode': result.returncode, 'stderr': result.stderr[-5000:], 'at': now()})
    if result.returncode:
        raise RuntimeError('proof cleanup failed')


def interrupted(signum, frame):
    raise InterruptedError(f'study interrupted by signal {signum}')


def main():
    prepare()
    before = production_identity()
    save('production-before.json', before)
    print(json.dumps({'stage': 'prepared', 'output': str(ROOT)}), flush=True)
    result = {'started_at': now(), 'kind': 'controlled feasibility', 'cycles': [], 'passed': False}
    events = start_events()
    try:
        execute(result)
    except Exception as error:
        result['error'] = str(error)
        print(json.dumps({'failed': str(error)}), flush=True)
        collect('failure-evidence', result['started_at'])
    finally:
        finish(result, (events, before))
    print(json.dumps({'passed': result['passed'], 'output': str(ROOT)}), flush=True)
    return 0 if result['passed'] else 1


def execute(result):
    for number in range(1, 4):
        print(json.dumps({'cycle': number, 'stage': 'starting clean stack'}), flush=True)
        result['cycles'].append(cycle(number))
        cleanup()
    result['passed'] = len(result['cycles']) == 3


def finish(result, state):
    events, before = state
    try:
        cleanup()
        after = production_identity()
        save('production-after.json', after)
        result['production_preserved'] = before == after
        result['passed'] = result['passed'] and before == after
    except Exception as error:
        result.update(passed=False, cleanup_error=str(error))
    finally:
        stop_events(events)
        result['finished_at'] = now()
        save('result.json', result)


signal.signal(signal.SIGTERM, interrupted)
signal.signal(signal.SIGINT, interrupted)
signal.signal(signal.SIGHUP, interrupted)
raise SystemExit(main())
