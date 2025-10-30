import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  let { id } = req.query;                      // 可能是 "xxx" 或 "xxx.json"
  const filename = id.endsWith('.json') ? id : `${id}.json`;

  const candidates = [
    path.join(process.cwd(), 'trajs', filename),
    path.join(process.cwd(), filename),        // 兜底：根目录
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p, 'utf-8');
      res.setHeader('Content-Type','application/json; charset=utf-8');
      return res.status(200).send(buf);
    }
  }
  res.status(404).json({ error: 'trajectory not found', id, tried: candidates });
}
