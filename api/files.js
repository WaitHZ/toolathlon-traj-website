
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const trajDir = path.join(process.cwd(), 'trajs');
  const files = fs.existsSync(trajDir)
    ? fs.readdirSync(trajDir).filter(f => f.endsWith('.json'))
    : [];
  res.status(200).json({ files });
}
