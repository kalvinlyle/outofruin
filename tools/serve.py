"""Serve the repo locally with caching off, so a plain reload always picks up
a rebuilt game archive.

    python3 tools/serve.py [port] [directory]
"""
import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8008
    directory = sys.argv[2] if len(sys.argv) > 2 else ROOT
    handler = functools.partial(NoCacheHandler, directory=directory)
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
