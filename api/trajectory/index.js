import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // Support both GET /api/trajectory?id=xxx and legacy POST with body.id
  const idRaw = (req.query && req.query.id) || (req.body && req.body.id) || '';
  if (!idRaw) {
    return res.status(400).json({ error: 'missing id' });
  }

  const filename = idRaw.endsWith('.json') ? idRaw : `${idRaw}.json`;

  const candidates = [
    path.join(process.cwd(), 'trajs', filename),
    path.join(process.cwd(), filename),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p, 'utf-8');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(buf);
    }
  }
  return res.status(404).json({ error: 'trajectory not found', id: idRaw, tried: candidates });
}


