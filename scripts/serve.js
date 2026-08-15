'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 5173);
const USER_FILE = path.join(ROOT, 'data', 'userData.json');
const GAME_FILE = path.join(ROOT, 'data', 'data.min.json');

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

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let size = 0;
    req.on('data', function (chunk) {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', function (err) {
      logError('readBody', err);
      reject(err);
    });
  });
}

function writeUtf8(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, { encoding: 'utf8' });
}

async function handleApi(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  try {
    if (req.method === 'POST' && url.pathname === '/api/save-user') {
      const text = await readBody(req, 8 * 1024 * 1024);
      JSON.parse(text);
      writeUtf8(USER_FILE, text);
      sendJson(res, 200, { ok: true });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/save-game-data') {
      const text = await readBody(req, 12 * 1024 * 1024);
      JSON.parse(text);
      writeUtf8(GAME_FILE, text);
      sendJson(res, 200, { ok: true });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/cloud') {
      const id = String(url.searchParams.get('id') || '').trim();
      if (!/^\d{1,10}$/.test(id)) {
        sendJson(res, 400, { ok: false, msg: '云端ID须为10位以内数字' });
        return;
      }
      const resp = await fetch('https://bcjh.xyz/api/download_data?id=' + encodeURIComponent(id));
      if (!resp.ok) {
        sendJson(res, 502, { ok: false, msg: '云端 HTTP ' + resp.status });
        return;
      }
      const rst = await resp.json();
      if (!rst || !rst.result) {
        sendJson(res, 400, { ok: false, msg: (rst && rst.msg) || '云端没有这份数据' });
        return;
      }
      let user = rst.data;
      if (typeof user === 'string') {
        user = JSON.parse(user);
      }
      sendJson(res, 200, { ok: true, user: user, name: rst.user || '' });
      return;
    }
    sendJson(res, 404, { ok: false, msg: 'unknown api' });
  } catch (err) {
    logError('api ' + url.pathname, err);
    sendJson(res, 500, { ok: false, msg: String(err.message || err) });
  }
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
    const pathname = (req.url || '/').split('?')[0];
    if (pathname.indexOf('/api/') === 0) {
      handleApi(req, res);
      return;
    }

    const filePath = safeJoin(ROOT, req.url || '/');
    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad path');
      return;
    }

    fs.stat(filePath, function (err, stat) {
      if (err) {
        if (path.basename(filePath) !== 'favicon.ico') {
          logError('stat ' + filePath, err);
        }
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
