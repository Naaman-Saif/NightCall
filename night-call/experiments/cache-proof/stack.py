import json
import time
import urllib.error
import urllib.request
from urllib.parse import urlencode

from common import ROOT, compose, now, remaining, save
from engine import address, inspect


def set_flag(value):
    path = ROOT / 'assets/src/flagd/demo.flagd.json'
    config = json.loads(path.read_text())
    config['flags']['recommendationCacheFailure']['defaultVariant'] = value
    path.write_text(json.dumps(config, indent=2) + '\n')


def request(endpoint, identity):
    request_id, trace_id = identity
    query = urlencode({'productIds': 'OLJCESPC7Z', 'currencyCode': 'USD', 'sessionId': request_id})
    request = urllib.request.Request(endpoint + '/api/recommendations?' + query)
    request.add_header('traceparent', f'00-{trace_id}-{trace_id[:16]}-01')
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            body = response.read()
            products = json.loads(body)
            return {'status': response.status, 'products': len(products) if isinstance(products, list) else 0,
                    'bytes': len(body), 'duration_ms': round((time.monotonic() - started) * 1000)}
    except urllib.error.HTTPError as error:
        return {'status': error.code, 'error': error.read(1024).decode(errors='replace')}
    except (OSError, TimeoutError) as error:
        return {'status': None, 'error': str(error), 'duration_ms': round((time.monotonic() - started) * 1000)}


def up():
    compose(['up', '-d', '--no-build', '--pull', 'never'], 300)
    endpoint = 'http://' + address('frontend') + ':8080'
    deadline = time.monotonic() + min(180, remaining())
    while time.monotonic() < deadline:
        result = request(endpoint, ('readiness', '0' * 31 + '1'))
        if result['status'] == 200:
            return endpoint
        time.sleep(2)
    raise RuntimeError('frontend recommendation API did not become ready: ' + str(result))


def reset_recommendation(endpoint):
    compose(['restart', 'recommendation'], 60)
    deadline = time.monotonic() + min(60, remaining())
    while time.monotonic() < deadline:
        state = inspect('recommendation')['State']
        if state.get('Health', {}).get('Status') == 'healthy':
            return
        time.sleep(1)
    raise RuntimeError('recommendation did not recover after restart')


def snapshot(name):
    services = ['recommendation', 'frontend', 'product-catalog', 'flagd', 'otel-collector', 'jaeger']
    fields = ['Id', 'Image', 'State', 'RestartCount', 'NetworkSettings', 'Mounts']
    save(name, {service: {key: value for key, value in inspect(service).items() if key in fields} for service in services})
