// SPDX-License-Identifier: LicenseRef-Blockscout

import React from 'react';

import type { IconName } from 'ui/shared/IconSvg';
import StatsWidget from 'ui/shared/stats/StatsWidget';

interface CustomStatConfig {
  url: string;
  label: string;
  jsonPath: string;
  icon?: IconName;
}

function getNestedValue(data: unknown, path: string): unknown {
  return path.split('.').reduce(
    (obj: unknown, key: string) =>
      obj !== null && typeof obj === 'object'
        ? (obj as Record<string, unknown>)[key]
        : undefined,
    data,
  );
}

interface SingleStatProps {
  config: CustomStatConfig;
  index: number;
}

const SingleCustomStat = ({ config, index }: SingleStatProps) => {
  const [ value, setValue ] = React.useState<string>('...');
  const [ isLoading, setIsLoading ] = React.useState(true);
  const [ hidden, setHidden ] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();

    fetch(`/node-api/custom-stat?index=${ index }`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 204) {
          setHidden(true);
          setIsLoading(false);
          return null;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${ res.status }`);
        }
        return res.json() as Promise<unknown>;
      })
      .then((data) => {
        if (data === null) {
          return;
        }
        const val = getNestedValue(data, config.jsonPath || 'value');
        setValue(val !== undefined && val !== null ? String(val) : 'N/A');
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== 'AbortError') {
          setValue('N/A');
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [ config.jsonPath, index ]);

  if (hidden) {
    return null;
  }

  return (
    <StatsWidget
      label={ config.label || 'Custom Stat' }
      value={ value }
      icon={ config.icon }
      isLoading={ isLoading }
    />
  );
};

const CustomStatWidget = () => {
  const [ configs, setConfigs ] = React.useState<Array<CustomStatConfig> | null>(null);

  React.useEffect(() => {
    fetch('/custom-config.json')
      .then((r) => r.json() as Promise<CustomStatConfig | Array<CustomStatConfig>>)
      .then((data) => {
        setConfigs(Array.isArray(data) ? data : [ data ]);
      })
      .catch(() => setConfigs([]));
  }, []);

  if (!configs) {
    // Show a single loading placeholder while config is being fetched
    return <StatsWidget label="Custom Stat" value="..." isLoading={ true }/>;
  }

  if (configs.length === 0) {
    return null;
  }

  return (
    <>
      { configs.map((cfg, i) => (
        <SingleCustomStat key={ i } config={ cfg } index={ i }/>
      )) }
    </>
  );
};

export default CustomStatWidget;
