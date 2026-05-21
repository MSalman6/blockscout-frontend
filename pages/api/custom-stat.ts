// SPDX-License-Identifier: LicenseRef-Blockscout

import type { NextApiRequest, NextApiResponse } from 'next';

interface CustomStatConfig {
  url: string;
  label: string;
  jsonPath: string;
}

const handler = async(req: NextApiRequest, res: NextApiResponse) => {
  let configs: Array<CustomStatConfig>;
  try {
    // eslint-disable-next-line no-restricted-properties
    const path = require('path');
    // eslint-disable-next-line no-restricted-properties
    const { readFileSync } = require('fs');
    const configPath = path.resolve('public', 'custom-config.json');
    const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as unknown;
    configs = Array.isArray(raw) ? raw as Array<CustomStatConfig> : [ raw as CustomStatConfig ];
  } catch (e) {
    res.status(500).json({ error: 'Failed to read config' });
    return;
  }

  const indexParam = req.query.index;
  const index = indexParam !== undefined ? Number(indexParam) : 0;

  if (isNaN(index) || index < 0 || index >= configs.length) {
    res.status(404).json({ error: 'Stat index out of range' });
    return;
  }

  const config = configs[index];

  if (!config.url) {
    res.status(204).end();
    return;
  }

  try {
    const upstream = await fetch(config.url);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Upstream returned ${ upstream.status }` });
      return;
    }
    const data = await upstream.json() as unknown;
    // Normalize primitives so jsonPath always works on an object.
    const normalized = (typeof data === 'object' && data !== null) ? data : { value: data };
    res.status(200).json(normalized);
  } catch {
    res.status(502).json({ error: 'Failed to fetch upstream' });
  }
};

export default handler;
