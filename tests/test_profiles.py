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
import zlib
import struct
import http.client
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from urllib.parse import urlsplit

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
        for slug, name in [('mina', 'Mina <Test>'), ('other', 'Other'), ('apply', 'Apply Test'), ('styles', 'Style Test'), ('uploads', 'Upload Test')]:
            config = {'id': slug, 'name': name, 'data_dir': f'model-data/{slug}', 'sample_count': 5, 'initial_view': 'all'}
            (cls.root/'profiles'/f'{slug}.json').write_text(json.dumps(config))
        for slug in ['mina', 'other', 'example', 'apply', 'styles', 'uploads']:
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

    def test_large_original_and_cloud_links(self):
        original = PHOTO + b'\0' * (26 * 1024 * 1024)
        uploaded = json.loads(self.request('uploads', '/api/upload', original, {'Content-Type':'image/png'})[0])['photo']
        self.assertEqual(self.request('uploads', uploaded['image'])[0], original)
        for url in ['https://www.dropbox.com/scl/fo/example?dl=0', 'https://drive.google.com/drive/folders/example', 'https://photos.app.goo.gl/example']:
            result = json.loads(self.request('uploads', '/api/link', {'url':url})[0])
            self.assertEqual(result['link']['url'], url)
        conn = http.client.HTTPConnection(urlsplit(self.urls['uploads']).netloc, timeout=5)
        conn.request('POST', '/api/upload', headers={'Origin':self.urls['uploads'], 'Content-Length':str(100 * 1024 * 1024 + 1)})
        response = conn.getresponse()
        self.assertEqual(response.status, 400)
        self.assertIn(b'100 MB', response.read())
        conn.close()

    @unittest.skipUnless(shutil.which('sips'), 'HEIC/TIFF previews use the built-in macOS converter')
    def test_apple_and_tiff_originals_with_browser_previews(self):
        def chunk(kind, data):
            return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
        png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 2, 2, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress((b'\0' + b'\xff\0\0' * 2) * 2)) + chunk(b'IEND', b'')
        source = self.root / 'conversion-source.png'
        source.write_bytes(png)
        for format in ['heic', 'tiff']:
            target = self.root / ('converted.' + format)
            subprocess.run(['sips', '-s', 'format', format, str(source), '--out', str(target)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            original = target.read_bytes()
            photo = json.loads(self.request('styles', '/api/upload', original, {'Content-Type':'image/' + format})[0])['photo']
            self.assertEqual(self.request('styles', photo['original'])[0], original)
            preview, headers = self.request('styles', photo['image'])
            self.assertTrue(preview.startswith(b'\xff\xd8\xff'))
            self.assertEqual(headers['Content-Type'], 'image/jpeg')
            self.assertTrue(json.loads(self.request('styles', '/api/upload', original)[0])['duplicate'])
        with self.assertRaises(HTTPError) as caught:
            self.request('styles', '/api/upload', b'\0\0\0\x18ftypheic\0\0\0\0heic')
        self.assertEqual(caught.exception.code, 400)
        caught.exception.close()

    def test_apply_saved_suggestions(self):
        data = json.loads(self.request('apply', '/api/photos')[0])
        names = [p['filename'] for p in data['photos']]
        base = {'decision':'keep', 'frame':'', 'types':[], 'uses':[], 'smile':False, 'notes':'my note', 'labelsReviewed':False}
        with self.assertRaises(HTTPError) as caught:
            self.request('apply', '/api/apply-suggestions', {})
        self.assertEqual(caught.exception.code, 409)
        caught.exception.close()
        self.assertFalse((self.root/'model-data/apply/review-selections.json').exists())
        for i, name in enumerate(names):
            choice = {**base, 'decision':'reject' if i in [2,4] else 'keep'}
            if i == 0: choice.update(labelsReviewed=True, frame='close-up', types=['beauty'])
            self.request('apply', '/api/selection', {'filename':name, 'selection':choice})
        before = json.loads(self.request('apply', '/api/export')[0])
        suggestions = {name:{'frame':'full-length', 'angle':'front', 'types':['runway'], 'makeup':'no-makeup'} for name in names[:3]}
        (self.root/'model-data/apply/label-suggestions.json').write_text(json.dumps(suggestions))
        result = json.loads(self.request('apply', '/api/apply-suggestions', {})[0])
        self.assertEqual((result['applied'], result['preserved'], result['missing']), (1,1,1))
        after = json.loads(self.request('apply', '/api/export')[0])
        self.assertEqual(after[names[0]], before[names[0]])
        self.assertEqual(after[names[2]], before[names[2]])
        self.assertEqual(after[names[1]]['frame'], 'full-length')
        self.assertEqual(after[names[1]]['types'], ['runway'])
        self.assertEqual(after[names[1]]['notes'], 'my note')
        self.assertEqual(after[names[1]]['makeup'], 'unknown')
        self.assertFalse(after[names[1]]['labelsReviewed'])
        repeat = json.loads(self.request('apply', '/api/apply-suggestions', {})[0])
        self.assertEqual(repeat['applied'], 0)

    def test_clothing_styles_save_and_legacy_labels_survive(self):
        data = json.loads(self.request('styles', '/api/photos')[0])
        name = data['photos'][0]['filename']
        base = {'decision':'keep', 'frame':'', 'types':[], 'uses':[], 'smile':False, 'notes':''}
        for style in ['casual', 'swimwear', 'activewear', 'streetwear', 'runway-wear', 'formal-evening', 'jeans', 'trousers', 'shorts', 'skirt-dress']:
            self.request('styles', '/api/selection', {'filename':name, 'selection':{**base, 'clothing':style}})
            saved = json.loads(self.request('styles', '/api/export')[0])
            self.assertEqual(saved[name]['clothing'], style)

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
