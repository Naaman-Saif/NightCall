import json
import subprocess
import time
import urllib.request

from common import PROJECT, ROOT, now, run, save
from engine import address


def start_events():
    stream = (ROOT / 'docker-events.jsonl').open('w')
    args = ['docker', 'events', '--filter', f'label=com.docker.compose.project={PROJECT}', '--format', '{{json .}}']
    process = subprocess.Popen(args, stdout=stream, stderr=subprocess.DEVNULL)
    return process, stream


def stop_events(handle):
    process, stream = handle
    process.terminate()
    process.wait(timeout=10)
    stream.close()


def oom_events(since):
    path = ROOT / 'docker-events.jsonl'
    entries = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    return [e for e in entries if e.get('Action') == 'oom' and e.get('time', 0) >= since
            and e.get('Actor', {}).get('Attributes', {}).get('name') == PROJECT + '-recommendation']


def collect(name, started):
    path = ROOT / name
    path.mkdir(parents=True, exist_ok=True)
    for service in ['recommendation', 'frontend', 'product-catalog', 'flagd', 'otel-collector']:
        args = ['docker', 'logs', '--since', started, '--timestamps', '--tail', '15000', PROJECT + '-' + service]
        logs = subprocess.run(args, capture_output=True, text=True, timeout=20)
        (path / (service + '.log')).write_text(logs.stdout + logs.stderr)
    collect_traces(name)


def collect_traces(name):
    endpoint = 'http://' + address('jaeger') + ':16686/jaeger/ui/api/traces?service=recommendation&limit=300'
    try:
        with urllib.request.urlopen(endpoint, timeout=15) as response:
            save(name + '/traces.json', json.load(response))
    except Exception as error:
        save(name + '/trace-error.json', {'error': str(error), 'at': now()})
