# LLM-traj (Final Vercel-ready)

- Static front-end (HTML/CSS/JS) + Serverless APIs for trajectories.
- Pretty URLs supported: `/<model>_<task>` via `vercel.json` rewrites.
- Selects sync with URL; direct path loads correct trajectory.

## Local dev (Vercel)
```bash
npm i -g vercel
vercel dev
```

## Deploy
Push to Git and import on Vercel, or:
```bash
vercel
vercel --prod
```