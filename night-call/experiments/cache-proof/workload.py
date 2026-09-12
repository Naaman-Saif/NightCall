import json
import time
import uuid

from common import ROOT, now, remaining, save
from engine import observation
from stack import request


def workload(endpoint, settings):
    name, count, stop_on_failure = settings
    before = observation()
    started = time.monotonic()
    path = ROOT / (name + '.jsonl')
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w') as stream:
        samples = record(endpoint, (settings, before, stream))
    return summarize(samples, {'name': name, 'before': before, 'elapsed': time.monotonic() - started})


def record(endpoint, context):
    (name, count, stop_on_failure), before, stream = context
    samples = []
    for index in range(count):
        item = sample(endpoint, (name, index))
        samples.append(item)
        stream.write(json.dumps(item) + '\n')
        stream.flush()
        if should_stop(item, (before, stop_on_failure)):
            break
        time.sleep(max(0, 0.2 - item['request_seconds']))
    return samples


def sample(endpoint, position):
    if remaining() <= 0:
        raise TimeoutError('study budget exhausted')
    name, index = position
    trace_id = uuid.uuid4().hex
    started = time.monotonic()
    result = request(endpoint, (f'{name}-{index}', trace_id))
    value = {'at': now(), 'index': index + 1, 'trace_id': trace_id, 'response': result}
    value.update(observation())
    value['request_seconds'] = time.monotonic() - started
    if index % 25 == 0 or result['status'] != 200:
        print(json.dumps({'stage': name, 'request': index + 1, 'status': result['status'], 'memory': value['memory_bytes'], 'restarts': value['restarts']}), flush=True)
    return value


def should_stop(item, controls):
    before, enabled = controls
    return enabled and (item['response']['status'] != 200 or item['restarts'] > before['restarts'] or item['state'].get('OOMKilled'))


def summarize(samples, context):
    memories = [item['memory_bytes'] for item in samples if item['memory_bytes'] is not None]
    result = {'started_at': samples[0]['at'], 'finished_at': now(), 'count': len(samples),
              'errors': sum(item['response']['status'] != 200 for item in samples),
              'empty_responses': sum(item['response'].get('products') == 0 for item in samples),
              'peak_memory_bytes': max(memories) if memories else None,
              'before': context['before'], 'after': observation(), 'elapsed_seconds': context['elapsed']}
    save(context['name'] + '-summary.json', result)
    return result
