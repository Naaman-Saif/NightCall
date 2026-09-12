import hashlib
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

SHOP = Path('/root/code/astronomy-shop')
ROOT = Path(sys.argv[1]).resolve()
PROJECT = 'nc-cache-proof'
NETWORK = PROJECT + '-network'
STARTED = time.monotonic()


def now():
    return datetime.now(timezone.utc).isoformat()


def remaining():
    return max(0, 1800 - (time.monotonic() - STARTED))


def run(args, timeout=60):
    if remaining() <= 0:
        raise TimeoutError('study budget exhausted')
    result = subprocess.run(args, capture_output=True, text=True, timeout=min(timeout, remaining()))
    if result.returncode:
        raise RuntimeError(f'{args[:3]} failed: {result.stderr[-4000:]}')
    return result.stdout


def save(name, value):
    path = ROOT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def production_identity():
    info = json.loads(run(['docker', 'inspect', 'recommendation']))[0]
    source = run(['docker', 'exec', 'recommendation', 'sha256sum', '/app/recommendation_server.py'])
    return {'flag_sha256': digest(SHOP / 'src/flagd/demo.flagd.json'), 'image': info['Image'], 'source': source.strip()}


def compose(args, timeout=240):
    return run(['docker', 'compose', '-p', PROJECT, '-f', str(ROOT / 'compose.json'), *args], timeout)
