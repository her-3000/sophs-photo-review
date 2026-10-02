import base64
import importlib.util
import json
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

SOURCE = Path(__file__).resolve().parents[1]
PHOTO = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6l9sAAAAASUVORK5CYII=')

class ProfileTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temp.name)
        for name in ['server.py', 'app.js', 'index.html', 'style.css', 'create_model.py']:
            shutil.copyfile(SOURCE/name, cls.root/name)
        for name in ['profiles', 'assets', 'examples']:
            shutil.copytree(SOURCE/name, cls.root/name)
        cls.processes = []
        cls.urls = {}
        for slug, name in [('mina', 'Mina <Test>'), ('other', 'Other')]:
            config = {'id': slug, 'name': name, 'data_dir': f'model-data/{slug}', 'sample_count': 5, 'initial_view': 'all'}
            (cls.root/'profiles'/f'{slug}.json').write_text(json.dumps(config))
        for slug in ['mina', 'other', 'example']:
            with socket.socket() as sock:
                sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
            process = subprocess.Popen([sys.executable, 'server.py', '--profile', f'profiles/{slug}.json', '--port', str(port)], cwd=cls.root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            cls.processes.append(process)
            cls.urls[slug] = f'http://127.0.0.1:{port}'
            for _ in range(100):
                try:
                    with urlopen(cls.urls[slug]+'/api/photos', timeout=.5): break
                except OSError:
                    time.sleep(.03)
            else: raise AssertionError('Server did not start')

    @classmethod
    def tearDownClass(cls):
        for process in cls.processes:
            process.terminate(); process.wait(timeout=5)
        cls.temp.cleanup()

    def request(self, slug, path, data=None, headers=None):
        supplied = headers or {}
        if data is not None:
            supplied = {'Origin': self.urls[slug], 'Content-Type': 'application/json', **supplied}
            if not isinstance(data, bytes): data = json.dumps(data).encode()
        with urlopen(Request(self.urls[slug]+path, data=data, headers=supplied), timeout=5) as result:
            return result.read(), result.headers

    def test_identity_and_empty_external_assets(self):
        page, _ = self.request('mina', '/')
        text = page.decode()
        self.assertIn('<h1>Mina &lt;Test&gt;’s photos</h1>', text)
        self.assertNotIn('application-loop', text)
        self.assertNotIn('{{PHOTO_TITLE}}', text)
        data = json.loads(self.request('example', '/api/photos')[0])
        self.assertEqual(data['profile']['title'], 'Example photos')
        self.assertEqual(len(data['photos']), 5)
        self.assertEqual(data['selections'], {})
        self.assertEqual(data['suggestions'], {})
        _, headers = self.request('example', '/photos/example-1.svg')
        self.assertEqual(headers['Content-Type'], 'image/svg+xml')
        _, headers = self.request('example', '/brand-logo')
        self.assertEqual(headers['Content-Type'], 'image/svg+xml')

    def test_upload_save_and_profile_isolation(self):
        uploaded = json.loads(self.request('mina', '/api/upload', PHOTO, {'Content-Type': 'image/png', 'X-Filename': 'test.png'})[0])
        photo = uploaded['photo']
        self.assertEqual(self.request('mina', photo['image'])[0], PHOTO)
        duplicate = json.loads(self.request('mina', '/api/upload', PHOTO, {'Content-Type': 'image/png'})[0])
        self.assertTrue(duplicate['duplicate'])
        selection = {'decision':'keep', 'frame':'full-length', 'types':['runway'], 'uses':['comp-card'], 'smile':False, 'notes':'own collection'}
        self.request('mina', '/api/selection', {'filename':photo['filename'], 'selection':selection})
        saved = json.loads(self.request('mina', '/api/export')[0])
        self.assertEqual(saved[photo['filename']]['decision'], 'keep')
        self.assertEqual(json.loads(self.request('other', '/api/export')[0]), {})
        other = json.loads(self.request('other', '/api/photos')[0])
        self.assertNotIn(photo['filename'], [p['filename'] for p in other['photos']])
        self.request('mina', '/api/link', {'url':'https://example.com/portfolio', 'title':'Portfolio'})
        self.assertEqual(json.loads(self.request('other', '/api/photos')[0])['links'], [])

    def test_access_boundaries(self):
        for path, data, headers in [('/', None, {'Host':'evil.example'}), ('/api/link', b'{}', {'Origin':'https://evil.example','Content-Type':'application/json'}), ('/photos/../server.py', None, {})]:
            with self.assertRaises(HTTPError) as caught:
                self.request('other', path, data, headers)
            self.assertIn(caught.exception.code, [403,404])
            caught.exception.close()

    def test_new_model_setup_does_not_overwrite(self):
        spec=importlib.util.spec_from_file_location('setup_model', self.root/'create_model.py')
        module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        profile=module.create_model('jenny', 'Jennifer')
        config=json.loads(profile.read_text())
        self.assertEqual(config['name'], 'Jennifer')
        self.assertEqual(config['data_dir'], 'model-data/jenny')
        with self.assertRaises(ValueError): module.create_model('jenny', 'Changed')
        self.assertEqual(json.loads(profile.read_text())['name'], 'Jennifer')
        with self.assertRaises(ValueError): module.create_model('../bad', 'Bad')

if __name__ == '__main__': unittest.main()
