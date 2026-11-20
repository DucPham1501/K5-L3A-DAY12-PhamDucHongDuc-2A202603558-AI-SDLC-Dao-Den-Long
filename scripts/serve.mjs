import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBoard, addEntry } from './leaderboard-store.mjs';

// `node scripts/serve.mjs --export-leaderboard out.json` → {"entries":[...]} in rank order, then exit.
const args = process.argv.slice(2);
if (args.includes('--export-leaderboard')) {
  if (args.length !== 2 || args[0] !== '--export-leaderboard' || !args[1] || args[1].startsWith('--')) {
    process.stderr.write('Usage: node scripts/serve.mjs --export-leaderboard out.json\n');
    process.exit(2);
  }
  try {
    const { entries } = await readBoard();
    await writeFile(args[1], JSON.stringify({ entries }, null, 2) + '\n');
    console.log(`Exported ${entries.length} leaderboard entries to ${args[1]}`);
    process.exit(0);
  } catch (error) {
    process.stderr.write(`Leaderboard export failed: ${error.message}\n`);
    process.exit(1);
  }
} else if (args.length) {
  process.stderr.write('Unknown arguments. Usage: node scripts/serve.mjs [--export-leaderboard out.json]\n');
  process.exit(2);
}

const project = fileURLToPath(new URL('../', import.meta.url));
const root = path.join(project, 'dist');
if (!existsSync(path.join(root, 'index.html'))) throw new Error('Run npm run build first');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/api/leaderboard') {
      if (req.method === 'GET') { json(res, 200, await readBoard()); return; }
      if (req.method === 'POST') {
        const origin = req.headers.origin;
        if (origin && origin !== `http://${req.headers.host}`) { json(res, 403, { error: 'Forbidden origin' }); return; }
        let body = '';
        for await (const chunk of req) { body += chunk; if (body.length > 4096) { json(res, 413, { error: 'Too large' }); return; } }
        try { json(res, 200, await addEntry(JSON.parse(body))); }
        catch (error) { json(res, 400, { error: error.message }); }
        return;
      }
      res.writeHead(405); res.end('Method not allowed'); return;
    }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(Number(process.env.PORT ?? 4173), '127.0.0.1', () => console.log(`Đảo Đèn Lồng: http://127.0.0.1:${server.address().port}`));
