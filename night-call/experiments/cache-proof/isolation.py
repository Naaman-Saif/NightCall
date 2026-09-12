import json
import shutil
from pathlib import Path

from common import NETWORK, PROJECT, ROOT, SHOP, run


def copy_mount(mount, name):
    source = Path(mount['source']).resolve()
    if mount['type'] != 'bind' or not source.is_relative_to(SHOP):
        raise ValueError(f'unsupported mount for {name}: {source}')
    target = ROOT / 'assets' / source.relative_to(SHOP)
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        shutil.copytree(source, target) if source.is_dir() else shutil.copy2(source, target)
    return {'type': 'bind', 'source': str(target), 'target': mount['target'], 'read_only': True}


def isolate_service(name, service):
    original = json.loads(run(['docker', 'inspect', name]))[0]
    service['image'] = original['Image']
    service['container_name'] = PROJECT + '-' + name
    service['ports'] = []
    service['networks'] = {'default': None}
    service['volumes'] = [copy_mount(m, name) for m in service.get('volumes', [])]
    for key in ['build', 'develop', 'profiles']:
        service.pop(key, None)
    return {'image': original['Image'], 'memory_limit': original['HostConfig']['Memory']}


def validate(document):
    for name, service in document['services'].items():
        validate_service(name, service)
    network = document['networks']['default']
    assert network['internal'] and network['name'] == NETWORK


def validate_service(name, service):
    assert service['container_name'] == PROJECT + '-' + name
    assert not service.get('ports') and not service.get('network_mode')
    assert not service.get('privileged') and not service.get('pid')
    assert service['networks'] == {'default': None}
    for mount in service.get('volumes', []):
        assert mount['type'] == 'bind' and mount['read_only']
        assert Path(mount['source']).resolve().is_relative_to(ROOT)
        assert mount['target'] not in ['/hostfs', '/var/run/docker.sock']
