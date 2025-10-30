
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const trajDir = path.join(process.cwd(), 'trajs');
  const files = fs.existsSync(trajDir)
    ? fs.readdirSync(trajDir).filter(f => f.endsWith('.json'))
    : [];

  const models = {};
  for (const f of files) {
    const base = f.replace(/\.json$/, '');
    const underscore = base.indexOf('_');
    const model = underscore === -1 ? base : base.slice(0, underscore);
    const task  = underscore === -1 ? 'unknown' : base.slice(underscore + 1);
    if (!models[model]) models[model] = [];
    models[model].push({ filename: f, task });
  }
  res.status(200).json({ models });
}
