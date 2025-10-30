// api/models.js
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const trajDir = path.join(process.cwd(), 'trajs');
  const files = fs.existsSync(trajDir)
    ? fs.readdirSync(trajDir).filter(f => f.endsWith('.json'))
    : [];

  // 期望输出形如：
  // {
  //   models: {
  //     "claude-4.5-sonnet": [
  //       { filename: "claude-4.5-sonnet_ab-testing.json", task: "ab-testing" },
  //       { filename: "claude-4.5-sonnet_canvas-do-quiz.json", task: "canvas-do-quiz" },
  //       ...
  //     ],
  //     ...
  //   }
  // }
  const models = {};

  for (const f of files) {
    const base = f.replace(/\.json$/, ''); // e.g. "claude-4.5-sonnet_ab-testing"
    const underscore = base.indexOf('_');
    // 文件名约定：<model>_<task>.json
    // 注意：model 里可能包含连字符（-），但不会包含下划线（_）
    const model = underscore === -1 ? base : base.slice(0, underscore);
    const task = underscore === -1 ? 'unknown' : base.slice(underscore + 1);

    if (!models[model]) models[model] = [];
    models[model].push({ filename: f, task });
  }

  res.status(200).json({ models });
}
