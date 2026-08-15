'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 5173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function logError(where, err) {
  console.error('[serve]', where, err && err.stack ? err.stack : err);
}

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const relative = decoded === '/' ? '/web/index.html' : decoded;
  const resolved = path.normalize(path.join(root, relative));
  if (!resolved.startsWith(root)) {
    return null;
  }
  return resolved;
}

const server = http.createServer(function (req, res) {
  try {
    const filePath = safeJoin(ROOT, req.url || '/');
    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad path');
      return;
    }

    fs.stat(filePath, function (err, stat) {
      if (err) {
        logError('stat ' + filePath, err);
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const finalPath = stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
      fs.readFile(finalPath, function (readErr, buf) {
        if (readErr) {
          logError('read ' + finalPath, readErr);
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not found');
          return;
        }
        const ext = path.extname(finalPath).toLowerCase();
        res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
        res.end(buf);
      });
    });
  } catch (err) {
    logError('request', err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Server error');
  }
});

server.listen(PORT, '127.0.0.1', function () {
  console.log('打开 http://127.0.0.1:' + PORT + '/web/');
});
