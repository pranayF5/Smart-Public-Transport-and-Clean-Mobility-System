const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(FEEDBACK_FILE)) fs.writeFileSync(FEEDBACK_FILE, '[]', 'utf8');

const routes = [
  { id: 'M1', name: 'Metro Blue Line', mode: 'Metro', from: 'Miyapur', to: 'LB Nagar', duration: 42, fare: 45, frequency: '6 min', status: 'On time', color: '#3778f6' },
  { id: 'B7', name: 'City Express 7', mode: 'Bus', from: 'Kukatpally', to: 'Secunderabad', duration: 38, fare: 25, frequency: '10 min', status: 'On time', color: '#12a886' },
  { id: 'M3', name: 'Metro Red Line', mode: 'Metro', from: 'Nagole', to: 'Raidurg', duration: 48, fare: 50, frequency: '7 min', status: 'Minor delay', color: '#f59e0b' },
  { id: 'C2', name: 'Cycle Connect', mode: 'Cycle', from: 'HITEC City', to: 'Durgam Cheruvu', duration: 16, fare: 10, frequency: 'Available now', status: 'Available', color: '#8b5cf6' },
  { id: 'B12', name: 'Green City Bus 12', mode: 'Electric bus', from: 'Gachibowli', to: 'Charminar', duration: 55, fare: 30, frequency: '12 min', status: 'On time', color: '#16a34a' }
];

function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Requested-With'
  });
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''; req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
function safeReadFeedback() {
  try { return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8')); } catch { return []; }
}
function staticFile(req, res, pathname) {
  let requested = pathname === '/' ? '/index.html' : pathname;
  const full = path.resolve(PUBLIC, '.' + requested);
  if (!full.startsWith(PUBLIC + path.sep) && full !== path.join(PUBLIC, 'index.html')) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(full, (err, content) => {
    if (err) return send(res, 404, 'File not found', 'text/plain; charset=utf-8');
    const ext = path.extname(full).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.ico': 'image/x-icon'
    };
    send(res, 200, content, types[ext] || 'application/octet-stream');
  });
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Requested-With'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);
  if (req.method === 'GET' && pathname === '/api/health') return send(res, 200, { status: 'ok', app: 'Smart Public Transport and Clean Mobility System', time: new Date().toISOString() });
  if (req.method === 'GET' && pathname === '/api/routes') {
    const mode = (url.searchParams.get('mode') || 'all').toLowerCase();
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const result = routes.filter(r => (mode === 'all' || r.mode.toLowerCase() === mode) && (!q || `${r.name} ${r.from} ${r.to} ${r.mode}`.toLowerCase().includes(q)));
    return send(res, 200, { routes: result, count: result.length });
  }
  if (pathname === '/api/plan') {
    if (req.method === 'GET') {
      return send(res, 200, { status: 'ok', message: 'Send a POST request with JSON { "from": "...", "to": "..." } to plan a trip.' });
    }
    if (req.method === 'POST') {
      try {
        const body = await readBody(req);
        const from = String(body.from || '').trim(); const to = String(body.to || '').trim();
        if (!from || !to) return send(res, 400, { error: 'Please enter both starting point and destination.' });
        if (from.toLowerCase() === to.toLowerCase()) return send(res, 400, { error: 'Starting point and destination should be different.' });

        const fromLower = from.toLowerCase();
        const toLower = to.toLowerCase();
        const route = routes.find(r =>
          (r.from.toLowerCase().includes(fromLower) && r.to.toLowerCase().includes(toLower)) ||
          (r.from.toLowerCase().includes(toLower) && r.to.toLowerCase().includes(fromLower)) ||
          r.from.toLowerCase().includes(fromLower) ||
          r.to.toLowerCase().includes(toLower) ||
          r.from.toLowerCase().includes(toLower) ||
          r.to.toLowerCase().includes(fromLower)
        ) || routes[0];

        const distanceKm = Math.max(2, Math.min(30, Math.round((route.duration / 60) * 22)));
        const carKg = distanceKm * 0.192; const transitKg = distanceKm * 0.045;
        return send(res, 200, {
          trip: {
            from,
            to,
            suggestedMode: route.mode,
            route: route.name,
            durationMinutes: route.duration,
            fareINR: route.fare,
            distanceKm,
            estimatedCO2Kg: Number(transitKg.toFixed(2)),
            carCO2Kg: Number(carKg.toFixed(2)),
            co2SavedKg: Number((carKg - transitKg).toFixed(2)),
            note: 'Demo estimate only. Actual routes, travel times, fares and emissions may vary.'
          }
        });
      } catch { return send(res, 400, { error: 'Could not read trip details. Please try again.' }); }
    }
  }
  if (req.method === 'GET' && pathname === '/api/stats') return send(res, 200, { stats: { activeRoutes: routes.length, electricOptions: routes.filter(r => r.mode.toLowerCase().includes('electric')).length, averageWaitMinutes: 9, estimatedDailyCO2SavedKg: 1280 } });
  if (req.method === 'POST' && pathname === '/api/feedback') {
    try {
      const body = await readBody(req); const message = String(body.message || '').trim();
      const rating = Number(body.rating);
      if (!message || message.length > 500) return send(res, 400, { error: 'Feedback must be between 1 and 500 characters.' });
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return send(res, 400, { error: 'Please select a rating from 1 to 5.' });
      const feedback = safeReadFeedback(); feedback.push({ id: Date.now(), rating, message, createdAt: new Date().toISOString() });
      fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2));
      return send(res, 201, { message: 'Thank you! Your feedback has been saved.' });
    } catch { return send(res, 400, { error: 'Could not save feedback.' }); }
  }
  if (req.method === 'GET' && pathname.startsWith('/api/')) return send(res, 404, { error: 'API endpoint not found.' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' });
  return staticFile(req, res, pathname);
});
server.listen(PORT, () => console.log(`Smart Mobility System running at http://localhost:${PORT}`));
