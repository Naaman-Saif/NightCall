import json
import time

from common import PROJECT, ROOT, compose, now, run, save
from engine import observation
from evidence import collect, oom_events
from stack import request, reset_recommendation, set_flag, snapshot, up
from workload import workload


def healthy(result, expected):
    responses = result['count'] == expected and result['errors'] == 0 and result['empty_responses'] == 0
    return responses and result['after']['restarts'] == result['before']['restarts']


def cold_observation(endpoint, name):
    before = observation()
    result = request(endpoint, ('cold-check', '0' * 31 + '3'))
    time.sleep(20)
    value = {'response': result, 'before': before, 'after_idle': observation(), 'idle_seconds': 20}
    save(name + '/cold.json', value)
    return value


def reproduce(endpoint, name):
    set_flag('on')
    reset_recommendation(endpoint)
    cold_observation(endpoint, name)
    started = time.time()
    failure = workload(endpoint, (name + '/fault', 400, True))
    time.sleep(2)
    events = oom_events(started)
    save(name + '/fault-oom-events.json', events)
    if not events or failure['errors'] == 0:
        raise RuntimeError('fault did not establish both recommendation OOM and an HTTP failure')
    return failure


def mitigate(endpoint, name):
    set_flag('off')
    reset_recommendation(endpoint)
    result = workload(endpoint, (name + '/mitigated', 400, False))
    limit = result['before']['limit_bytes']
    assert healthy(result, 400), 'mitigation workload failed'
    assert result['peak_memory_bytes'] < limit * 0.8, 'mitigation did not establish memory headroom'
    return result


def cycle(number):
    name = f'cycle-{number}'
    started = now()
    set_flag('off')
    endpoint = up()
    snapshot(name + '/initial-containers.json')
    source = run(['docker', 'exec', PROJECT + '-recommendation', 'sha256sum', '/app/recommendation_server.py'])
    assert source.strip() == json.loads((ROOT / 'production-before.json').read_text())['source']
    save(name + '/source.json', {'sha256sum': source.strip()})
    baseline = workload(endpoint, (name + '/baseline', 400, False))
    assert healthy(baseline, 400), 'healthy baseline failed'
    failure = reproduce(endpoint, name)
    recovery = mitigate(endpoint, name)
    collect(name + '/evidence', started)
    snapshot(name + '/final-containers.json')
    result = {'cycle': number, 'passed': True, 'baseline': baseline, 'fault': failure, 'mitigation': recovery}
    save(name + '/result.json', result)
    print(json.dumps({'cycle': number, 'passed': True}), flush=True)
    return result
