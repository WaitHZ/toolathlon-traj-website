import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const trajDir = path.join(process.cwd(), 'trajs');
  const files = fs.existsSync(trajDir)
    ? fs.readdirSync(trajDir).filter(f => f.endsWith('.json'))
    : [];

  const models = {};
  const tasks = new Set();

  for (const f of files) {
    const base = f.replace(/\.json$/,'');   // xxx_yyy
    const [model, ...rest] = base.split('_');
    const task = rest.join('_') || 'unknown';
    tasks.add(task);
    if (!models[model]) models[model] = [];
    models[model].push(task);
  }

  res.status(200).json({
    models,                    // { model: [task, ...] }
    tasks: [...tasks].sort(),  // 所有任务
  });
}
