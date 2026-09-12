import http.client
import json
import socket

from common import NETWORK, PROJECT


class DockerConnection(http.client.HTTPConnection):
    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect('/var/run/docker.sock')


def read(path):
    connection = DockerConnection('localhost', timeout=10)
    try:
        connection.request('GET', '/v1.45' + path)
        response = connection.getresponse()
        value = json.loads(response.read())
        if response.status != 200:
            raise RuntimeError(str(value))
        return value
    finally:
        connection.close()


def inspect(service):
    return read('/containers/' + PROJECT + '-' + service + '/json')


def address(service):
    networks = inspect(service)['NetworkSettings']['Networks']
    return networks[NETWORK]['IPAddress']


def observation():
    info = inspect('recommendation')
    stats = read('/containers/' + PROJECT + '-recommendation/stats?stream=false&one-shot=true')
    memory = stats.get('memory_stats', {})
    return {'memory_bytes': memory.get('usage'), 'limit_bytes': memory.get('limit'),
            'restarts': info['RestartCount'], 'state': info['State'], 'image': info['Image']}
