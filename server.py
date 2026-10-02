"""Private loopback-only photo review. Standard library; originals are read-only."""
import json
import os
import hashlib
import re
import csv
import argparse
import html
import mimetypes
from datetime import datetime, timezone
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, unquote
from threading import Lock

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description='Private SOPHS photo review')
parser.add_argument('--port', type=int, default=4188)
parser.add_argument('--profile', default='profiles/sophie.json')
args = parser.parse_args() if __name__ == '__main__' else argparse.Namespace(port=4188, profile='profiles/sophie.json')
CONFIG = json.loads((ROOT / args.profile).read_text())
PROFILE_ID = CONFIG['id']
PROFILE_NAME = CONFIG.get('name', '')
PROFILE_TITLE = CONFIG.get('title') or (f'{PROFILE_NAME}’s photos' if PROFILE_NAME else 'Example photos')
ARCHIVE = (ROOT / CONFIG.get('archive', f'model-data/{PROFILE_ID}/archive')).resolve()
ROWS = list(csv.DictReader((ARCHIVE / 'INDEX.csv').open())) if (ARCHIVE / 'INDEX.csv').exists() else []
if CONFIG.get('sample_count'):
    ROWS = ROWS[:CONFIG['sample_count']]
    if not ROWS:
        ARCHIVE = ROOT / 'examples'
        ROWS = list(csv.DictReader((ARCHIVE / 'INDEX.csv').open()))
FILES = {r['filename'] for r in ROWS}
DATA_DIR = (ROOT / CONFIG.get('data_dir', f'model-data/{PROFILE_ID}')).resolve()
DATA_DIR.mkdir(parents=True, exist_ok=True)
STATE = DATA_DIR / 'review-selections.json'
SUGGESTIONS = ROOT / CONFIG['suggestions'] if CONFIG.get('suggestions') else DATA_DIR / 'label-suggestions.json'
ADDITIONS = DATA_DIR / 'added-media.json'
UPLOADS = DATA_DIR / 'uploads'
ASSET_ROOT = Path(os.environ.get('SOPHS_REVIEW_ASSETS', str(ROOT.parents[1] / 'assets'))).expanduser().resolve()
LOGO = ASSET_ROOT / 'current' / 'sophsmodel-dp.png'
if not LOGO.exists():
    LOGO = ROOT / 'assets' / 'brand-fallback.svg'
PLASTIC = ASSET_ROOT / 'photo-review' / 'pink-cream-plastic-v1.png'
DEMO_ASSETS = ASSET_ROOT / 'photo-review' / 'application-demo'
DEMO_LOOP = DEMO_ASSETS / 'application-loop-v1.mp4'
DEMO_POSTER = DEMO_ASSETS / 'poster-v1.jpg'
LOCK = Lock()
ARCHIVE_HASHES = None
FRAMES = ['', 'close-up', 'mid-length', 'full-length', 'three-quarter-length', 'other']
ANGLES = ['unknown', 'front', 'three-quarter', 'side', 'rear']
MAKEUP = ['unknown', 'makeup', 'no-makeup']
FOOTWEAR = ['unknown', 'shoes', 'barefoot', 'not-visible']
CLOTHING = ['unknown', 'jeans', 'trousers', 'shorts', 'skirt-dress', 'swimwear', 'activewear', 'other']
TYPES = ['digitals', 'extras', 'e-commerce', 'pageant', 'fashion-editorial', 'runway', 'music-video', 'dancing', 'beauty', 'commercial-lifestyle', 'activewear', 'swimwear', 'behind-the-scenes', 'personal', 'other']
USES = ['comp-card', 'website', 'portfolio']
DECISIONS = ['unreviewed', 'keep', 'favourite', 'reject']
SHOTS = {'CU-01': {'frame': 'close-up', 'angle': 'front'}, 'ML-01': {'frame': 'mid-length', 'angle': 'front'}, 'PF-01': {'frame': 'close-up', 'angle': 'side'}, 'FL-01': {'frame': 'full-length', 'angle': 'front'}, 'JN-01': {'frame': 'full-length', 'angle': 'front', 'clothing': 'jeans'}}
ALIASES = {'mid-front': 'front-mid-length', 'mid-side': 'side-profile', 'full-length': 'full-length', 'full-body': 'full-length', 'close-up': 'front-close-up', 'rear-view': 'rear-view', 'three-quarter-length': 'three-quarter', 'three-quarter': 'three-quarter'}

def normalize(selection):
    result = dict(selection)
    old = {'front-close-up': ('close-up', 'front'), 'front-mid-length': ('mid-length', 'front'), 'side-profile': ('close-up', 'side'), 'three-quarter': ('three-quarter-length', 'unknown'), 'rear-view': ('other', 'rear')}
    frame, angle = old.get(result.get('frame'), (result.get('frame', ''), 'unknown'))
    result['frame'] = frame
    for key, value in [('angle', angle), ('makeup', 'unknown'), ('footwear', 'unknown'), ('clothing', 'unknown'), ('labelsReviewed', False)]:
        result.setdefault(key, value)
    return result

def read_state():
    return {name: normalize(s) for name, s in json.loads(STATE.read_text()).items()} if STATE.exists() else {}

def read_additions():
    return json.loads(ADDITIONS.read_text()) if ADDITIONS.exists() else {'photos': [], 'links': []}

def write_json(path, value):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    os.replace(tmp, path)

FILES.update(p['filename'] for p in read_additions()['photos'])

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def allowed(self):
        return self.headers.get('Host') == f'127.0.0.1:{self.server.server_port}'

    def respond(self, status, data, mime='application/json', headers=None):
        if not isinstance(data, bytes):
            data = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if not self.allowed():
            return self.respond(403, {'error': 'Local access only'})
        path = unquote(urlsplit(self.path).path)
        if path == '/api/photos':
            with LOCK:
                state = read_state()
                additions = read_additions()
            suggestions = json.loads(SUGGESTIONS.read_text()) if SUGGESTIONS.exists() else {}
            return self.respond(200, {'profile': {'id': PROFILE_ID, 'name': PROFILE_NAME, 'title': PROFILE_TITLE, 'initial_view': CONFIG.get('initial_view', 'all')}, 'photos': [{'filename': r['filename'], 'date': r['publication_date'], 'source': r['source_url']} for r in ROWS] + additions['photos'], 'links': additions['links'], 'selections': state, 'suggestions': suggestions})
        if path == '/api/export':
            with LOCK:
                state = read_state()
            return self.respond(200, state)
        if path in ['/', '/index.html', '/app.js', '/style.css']:
            name = 'index.html' if path == '/' else path[1:]
            mime = {'index.html': 'text/html; charset=utf-8', 'app.js': 'text/javascript; charset=utf-8', 'style.css': 'text/css; charset=utf-8'}[name]
            data = (ROOT / name).read_bytes()
            if name == 'index.html':
                page = data.decode()
                title = html.escape(PROFILE_TITLE)
                page = page.replace('{{PHOTO_TITLE}}', title)
                page = page.replace('{{PROFILE_ID}}', html.escape(PROFILE_ID))
                if not (DEMO_LOOP.exists() and DEMO_POSTER.exists()):
                    page = re.sub(r'<figure class="application-demo">.*?</figure>', '', page)
                data = page.encode()
            return self.respond(200, data, mime)
        if path == '/brand-logo':
            return self.respond(200, LOGO.read_bytes(), mimetypes.guess_type(LOGO.name)[0] or 'image/png')
        if path == '/plastic-background' and PLASTIC.exists():
            return self.respond(200, PLASTIC.read_bytes(), 'image/png')
        if path == '/you-model-poster' and DEMO_POSTER.exists():
            return self.respond(200, DEMO_POSTER.read_bytes(), 'image/jpeg')
        if path == '/you-model-loop' and DEMO_LOOP.exists():
            data = DEMO_LOOP.read_bytes()
            total = len(data)
            requested = self.headers.get('Range')
            headers = {'Accept-Ranges': 'bytes'}
            if not requested:
                return self.respond(200, data, 'video/mp4', headers)
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested)
            try:
                if not match or not any(match.groups()):
                    raise ValueError()
                first, last = match.groups()
                if first:
                    start = int(first)
                    end = min(int(last), total - 1) if last else total - 1
                else:
                    length = int(last)
                    if length <= 0:
                        raise ValueError()
                    start, end = max(0, total - length), total - 1
                if start >= total or start > end:
                    raise ValueError()
            except ValueError:
                return self.respond(416, b'', 'video/mp4', {'Content-Range': f'bytes */{total}', **headers})
            headers['Content-Range'] = f'bytes {start}-{end}/{total}'
            return self.respond(206, data[start:end + 1], 'video/mp4', headers)
        if path.startswith('/uploads/'):
            with LOCK:
                photo = next((p for p in read_additions()['photos'] if p['filename'] == path[9:]), None)
            if photo:
                return self.respond(200, (UPLOADS / photo['filename']).read_bytes(), photo['mime'])
        if path.startswith('/photos/') and any(r['filename'] == path[8:] for r in ROWS):
            return self.respond(200, (ARCHIVE / path[8:]).read_bytes(), mimetypes.guess_type(path)[0] or 'image/jpeg')
        return self.respond(404, {'error': 'Not found'})

    def do_POST(self):
        if not self.allowed() or self.headers.get('Origin') != f'http://127.0.0.1:{self.server.server_port}':
            return self.respond(403, {'error': 'Local access only'})
        if self.path == '/api/upload':
            return self.add_photo()
        if self.path == '/api/link' and self.headers.get('Content-Type') == 'application/json':
            return self.add_link()
        if self.path == '/api/apply-suggestions' and self.headers.get('Content-Type') == 'application/json':
            return self.apply_suggestions()
        if self.path == '/api/batch' and self.headers.get('Content-Type') == 'application/json':
            return self.batch_labels()
        if self.path != '/api/selection' or self.headers.get('Content-Type') != 'application/json':
            return self.respond(400, {'error': 'Invalid request'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 8192:
                raise ValueError()
            item = json.loads(self.rfile.read(size))
            filename, selection = item['filename'], item['selection']
            if filename not in FILES or not isinstance(selection, dict):
                raise ValueError()
            base = {'decision', 'frame', 'types', 'uses', 'smile', 'notes'}
            extra = {'angle', 'makeup', 'footwear', 'clothing', 'labelsReviewed'}
            if not base <= set(selection) or not set(selection) <= base | extra:
                raise ValueError()
            supplied = set(selection)
            selection = normalize(selection)
            if selection['decision'] not in DECISIONS or selection['frame'] not in FRAMES:
                raise ValueError()
            for key, allowed in [('angle', ANGLES), ('makeup', MAKEUP), ('footwear', FOOTWEAR), ('clothing', CLOTHING)]:
                if selection[key] not in allowed:
                    raise ValueError()
            if type(selection['labelsReviewed']) is not bool:
                raise ValueError()
            for key, allowed in [('types', TYPES), ('uses', USES)]:
                if not isinstance(selection[key], list) or len(selection[key]) > len(allowed) or any(x not in allowed for x in selection[key]):
                    raise ValueError()
            if type(selection['smile']) is not bool or not isinstance(selection['notes'], str) or len(selection['notes']) > 500:
                raise ValueError()
            with LOCK:
                state = read_state()
                # An older open tab can still save decisions without erasing new labels.
                if filename in state:
                    for key in extra - supplied:
                        selection[key] = state[filename][key]
                state[filename] = selection
                tmp = STATE.with_suffix('.tmp')
                tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')
                os.replace(tmp, STATE)
            self.respond(200, {'saved': True})
        except (ValueError, KeyError, TypeError):
            self.respond(400, {'error': 'Invalid selection'})
        except OSError:
            self.respond(500, {'error': 'Could not save. Please retry.'})

    def add_photo(self):
        global ARCHIVE_HASHES
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 25 * 1024 * 1024:
                return self.respond(400, {'error': 'Choose a photo up to 25 MB.'})
            data = self.rfile.read(size)
            if len(data) != size:
                raise ValueError()
            if data.startswith(b'\xff\xd8\xff'):
                extension, mime = 'jpg', 'image/jpeg'
            elif data.startswith(b'\x89PNG\r\n\x1a\n'):
                extension, mime = 'png', 'image/png'
            elif data.startswith(b'RIFF') and data[8:12] == b'WEBP':
                extension, mime = 'webp', 'image/webp'
            else:
                return self.respond(400, {'error': 'Choose a JPG, PNG or WebP photo.'})
            digest = hashlib.sha256(data).hexdigest()
            with LOCK:
                additions = read_additions()
                if ARCHIVE_HASHES is None:
                    ARCHIVE_HASHES = {hashlib.sha256((ARCHIVE / r['filename']).read_bytes()).hexdigest(): r['filename'] for r in ROWS}
                existing = ARCHIVE_HASHES.get(digest) or next((p['filename'] for p in additions['photos'] if p['sha256'] == digest), None)
                if existing:
                    return self.respond(200, {'duplicate': True, 'filename': existing})
                filename = f'upload-{digest}.{extension}'
                photo = {'filename': filename, 'original_name': Path(unquote(self.headers.get('X-Filename', 'Photo'))).name[:200], 'date': '', 'source': '', 'image': '/uploads/' + filename, 'mime': mime, 'sha256': digest, 'added_at': datetime.now(timezone.utc).isoformat()}
                UPLOADS.mkdir(exist_ok=True)
                (UPLOADS / filename).write_bytes(data)
                additions['photos'].append(photo)
                write_json(ADDITIONS, additions)
                FILES.add(filename)
            return self.respond(200, {'photo': photo})
        except (ValueError, TypeError):
            self.respond(400, {'error': 'Could not read this photo.'})
        except OSError:
            self.respond(500, {'error': 'Could not save this photo. Please retry.'})

    def add_link(self):
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 8192:
                raise ValueError()
            item = json.loads(self.rfile.read(size))
            url, title = item['url'].strip(), item.get('title', '').strip()
            parsed = urlsplit(url)
            if parsed.scheme not in ['https', 'http'] or not parsed.hostname or parsed.username or parsed.password or len(url) > 4096 or len(title) > 200 or any(c.isspace() for c in url):
                raise ValueError()
            link = {'url': url, 'title': title or parsed.hostname, 'added_at': datetime.now(timezone.utc).isoformat()}
            with LOCK:
                additions = read_additions()
                duplicate = any(l['url'] == url for l in additions['links'])
                if not duplicate:
                    additions['links'].append(link)
                    write_json(ADDITIONS, additions)
            self.respond(200, {'link': link, 'duplicate': duplicate})
        except (ValueError, KeyError, TypeError, AttributeError):
            self.respond(400, {'error': 'Enter a full http or https link and a short optional name.'})
        except OSError:
            self.respond(500, {'error': 'Could not save this link. Please retry.'})

    def apply_suggestions(self):
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 1024 or json.loads(self.rfile.read(size)) != {}:
                raise ValueError()
            with LOCK:
                state = read_state()
                remaining = sum(state.get(name, {}).get('decision', 'unreviewed') not in ['keep', 'favourite', 'reject'] for name in FILES)
                if remaining:
                    return self.respond(409, {'error': f'Keep or reject the remaining {remaining} photos first.'})
                suggestions = json.loads(SUGGESTIONS.read_text()) if SUGGESTIONS.exists() else {}
                if not isinstance(suggestions, dict):
                    raise ValueError()
                changed, preserved, missing = {}, 0, 0
                for name in sorted(FILES):
                    current = state.get(name, {})
                    if current.get('decision') not in ['keep', 'favourite']:
                        continue
                    if current.get('labelsReviewed'):
                        preserved += 1
                        continue
                    hint = suggestions.get(name)
                    if not isinstance(hint, dict):
                        missing += 1
                        continue
                    candidate = dict(current)
                    for key, allowed in [('frame', FRAMES), ('angle', ANGLES), ('makeup', ['unknown', 'makeup']), ('footwear', FOOTWEAR), ('clothing', CLOTHING)]:
                        if candidate.get(key, 'unknown') in ['', 'unknown'] and hint.get(key) in allowed:
                            candidate[key] = hint[key]
                    for key, allowed in [('types', TYPES), ('uses', USES)]:
                        values = hint.get(key, [])
                        if isinstance(values, list):
                            candidate[key] = list(dict.fromkeys(current.get(key, []) + [v for v in values if v in allowed]))
                    # Suggested labels remain candidates until individually confirmed.
                    if candidate != current:
                        state[name] = changed[name] = candidate
                if changed:
                    write_json(STATE, state)
            self.respond(200, {'selections': changed, 'applied': len(changed), 'preserved': preserved, 'missing': missing})
        except (ValueError, KeyError, TypeError):
            self.respond(400, {'error': 'Could not read saved suggestions.'})
        except OSError:
            self.respond(500, {'error': 'Could not save. Please retry.'})

    def batch_labels(self):
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 131072:
                raise ValueError()
            item = json.loads(self.rfile.read(size))
            if set(item) != {'filenames', 'category', 'shot'}:
                raise ValueError()
            names, category, shot = item['filenames'], item['category'], item['shot']
            if not isinstance(names, list) or not 0 < len(names) <= len(FILES) or any(not isinstance(n, str) or n not in FILES for n in names):
                raise ValueError()
            if category not in [''] + TYPES or shot not in [''] + list(SHOTS) or not (category or shot):
                raise ValueError()
            with LOCK:
                state = read_state()
                changed = {}
                for name in set(names):
                    selection = dict(state.get(name, normalize({'decision': 'unreviewed', 'frame': '', 'types': [], 'uses': [], 'smile': False, 'notes': ''})))
                    if category:
                        selection['types'] = list(dict.fromkeys(selection['types'] + [category]))
                    if shot:
                        selection.update(SHOTS[shot])
                    state[name] = changed[name] = selection
                tmp = STATE.with_suffix('.tmp')
                tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')
                os.replace(tmp, STATE)
            self.respond(200, {'selections': changed})
        except (ValueError, KeyError, TypeError):
            self.respond(400, {'error': 'Invalid batch labels'})
        except OSError:
            self.respond(500, {'error': 'Could not save. Please retry.'})

if __name__ == '__main__':
    # A gallery starts many image requests together; do not drop the burst.
    ThreadingHTTPServer.request_queue_size = 128
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'{PROFILE_TITLE}: http://127.0.0.1:{server.server_port}', flush=True)
    server.serve_forever()
