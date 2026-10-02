"""Live, read-only desktop/iPad/iPhone layout preview. No extra dependencies."""
import html
from pathlib import Path
import server as review

ROOT = Path(__file__).resolve().parent
WATCH = ['index.html', 'style.css', 'app.js', 'review-selections.json', 'label-suggestions.json', 'preview.css']

def document():
    page = (ROOT / 'index.html').read_text()
    page = page.replace('{{PHOTO_TITLE}}', html.escape(review.PROFILE_TITLE))
    page = page.replace('{{PROFILE_ID}}', html.escape(review.PROFILE_ID))
    if not (review.DEMO_LOOP.exists() and review.DEMO_POSTER.exists()):
        page = review.re.sub(r'<figure class="application-demo">.*?</figure>', '', page)
    return page

class Preview(review.Handler):
    def do_POST(self):
        return self.respond(403, {'error': 'Layout preview only. Edit photos on Sophie’s main review page.'})

    def do_GET(self):
        if not self.allowed():
            return self.respond(403, {'error': 'Local access only'})
        path = review.urlsplit(self.path).path
        if path in ['/', '/preview']:
            return self.respond(200, (ROOT / 'preview.html').read_bytes(), 'text/html; charset=utf-8')
        if path in ['/preview.css', '/preview.js']:
            mime = 'text/css' if path.endswith('.css') else 'text/javascript'
            return self.respond(200, (ROOT / path[1:]).read_bytes(), mime)
        if path == '/preview/document':
            return self.respond(200, {'html': document()})
        if path == '/preview/version':
            version = ':'.join(str((ROOT / name).stat().st_mtime_ns) if (ROOT / name).exists() else '0' for name in WATCH)
            return self.respond(200, {'version': version})
        return super().do_GET()

if __name__ == '__main__':
    review.ThreadingHTTPServer.request_queue_size = 128
    app = review.ThreadingHTTPServer(('127.0.0.1', 4191), Preview)
    print('Live responsive preview: http://127.0.0.1:4191/preview', flush=True)
    app.serve_forever()
