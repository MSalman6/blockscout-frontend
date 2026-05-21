// SPDX-License-Identifier: LicenseRef-Blockscout

import { NextRequest, NextResponse } from 'next/server';

interface CustomStatConfig {
  url: string;
  label: string;
  jsonPath: string;
}

export async function GET(req: NextRequest) {
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
    return NextResponse.json({ error: 'Failed to read config' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const indexParam = searchParams.get('index');
  const index = indexParam !== null ? Number(indexParam) : 0;

  if (isNaN(index) || index < 0 || index >= configs.length) {
    return NextResponse.json({ error: 'Stat index out of range' }, { status: 404 });
  }

  const config = configs[index];

  if (!config.url) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const upstream = await fetch(config.url);
    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream returned ${ upstream.status }` }, { status: upstream.status });
    }
    const data = await upstream.json() as unknown;
    const normalized = (typeof data === 'object' && data !== null) ? data : { value: data };
    return NextResponse.json(normalized);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch upstream' }, { status: 502 });
  }
}
