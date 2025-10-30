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
      if (seen.has(f)) continue;
      seen.add(f);
      files.push(f);
    }
  }

  // 返回 { models: { "<model>": [ { filename, task }, ... ] } }
  const models = {};
  for (const f of files) {
    const base = f.replace(/\.json$/, ''); // 例如 "claude-4.5-sonnet_ab-testing"
    const underscore = base.indexOf('_');
    const model = underscore === -1 ? base : base.slice(0, underscore);
    const task  = underscore === -1 ? 'unknown' : base.slice(underscore + 1);
    if (!models[model]) models[model] = [];
    models[model].push({ filename: f, task });
  }

  res.status(200).json({ models });
}
