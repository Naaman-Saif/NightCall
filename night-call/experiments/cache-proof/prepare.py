import json
import os

from common import NETWORK, PROJECT, ROOT, SHOP, run, save
from isolation import isolate_service, validate

EXCLUDED = {'frontend-proxy', 'load-generator', 'flagd-ui', 'grafana', 'telemetry-docs', 'opensearch'}
COLLECTOR = '''receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
processors:
  batch:
    timeout: 1s
exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true
  debug:
    verbosity: basic
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
'''


def prepare():
    assert ROOT.is_relative_to('/root/code/nightcall-cache-proof/runs')
    assert not ROOT.exists(), 'output directory already exists'
    existing = run(['docker', 'ps', '-aq', '--filter', f'label=com.docker.compose.project={PROJECT}'])
    assert not existing.strip(), 'proof resources already exist'
    networks = run(['docker', 'network', 'ls', '-q', '--filter', f'name=^{NETWORK}$'])
    assert not networks.strip(), 'proof network already exists'
    os.umask(0o077)
    ROOT.mkdir(parents=True)
    args = ['docker', 'compose', '--project-directory', str(SHOP), '--env-file', str(SHOP / '.env')]
    args += ['--env-file', str(SHOP / '.env.override'), '-p', 'prod']
    for name in ['compose.yaml', 'compose.full.yaml', 'compose.observability.yaml', 'compose.box-override.yaml']:
        args += ['-f', str(SHOP / name)]
    document = json.loads(run(args + ['config', '--format', 'json']))
    return isolate(document)


def isolate(document):
    document['name'] = PROJECT
    document['services'] = {k: v for k, v in document['services'].items() if k not in EXCLUDED}
    collector = document['services']['otel-collector']
    collector.update(volumes=[], command=['--config=/etc/proof-collector.yml'], depends_on={'jaeger': {'condition': 'service_started'}})
    identities = {name: isolate_service(name, service) for name, service in document['services'].items()}
    path = ROOT / 'collector.yml'
    path.write_text(COLLECTOR)
    path.chmod(0o644)
    collector['volumes'] = [{'type': 'bind', 'source': str(path), 'target': '/etc/proof-collector.yml', 'read_only': True}]
    document['networks'] = {'default': {'name': NETWORK, 'driver': 'bridge', 'internal': True}}
    assert not document.get('volumes'), 'named storage needs explicit isolation'
    validate(document)
    save('compose.json', document)
    save('images.json', identities)
    save('isolation.json', {'validated': True, 'internal_network': NETWORK, 'published_ports': [], 'host_mounts': []})
    return identities
