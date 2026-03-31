import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callWithFallback } from 'llm-fallback-chain';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load config at cold start
const config = JSON.parse(
  readFileSync(join(process.cwd(), 'llm.config.json'), 'utf-8')
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await callWithFallback(req.body, {
      config,
      onFallback: (from, to, err) => {
        console.log(`[fallback] ${from} → ${to}: ${err.message}`);
      },
    });

    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[error]', message);
    return res.status(500).json({ error: message });
  }
}
