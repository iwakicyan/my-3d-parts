# 作業台（workspace/*.html）を見るための小さなサーバー
#   python3 serve.py [ポート]   （既定 5180。このファイルのあるフォルダを配る）
# python3 -m http.server との違い
#   - .jsx も JavaScript として返す（作業台から parts/*.jsx をそのまま import できる）
#   - キャッシュさせない（パーツを書き換えてから再読み込みすると、すぐ新しい形になる）
import functools
import http.server
import os
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.jsx': 'text/javascript'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 5180
root = os.path.dirname(os.path.abspath(__file__))
http.server.ThreadingHTTPServer(('', port), functools.partial(Handler, directory=root)).serve_forever()
