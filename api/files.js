import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const dirs = [
    path.join(process.cwd(), 'trajs'),
    path.join(process.cwd(), 'public', 'trajs'),
  ];
  const seen = new Set();
  const files = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      if (seen.has(f)) continue; // 去重
      seen.add(f);
      files.push(f);
    }
  }
  res.status(200).json({ files });
}
