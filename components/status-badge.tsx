'use client';

import { useState, useEffect } from 'react';

interface HealthEntry {
  status: 'online' | 'offline' | 'ftp';
  code: number;
  slugs: string[];
  checkedAt: string;
}

interface HealthData {
  updatedAt: string;
  results: Record<string, HealthEntry>;
}

/**
 * Normalise a url_base value the same way the health-check script does:
 *  1. Strip template variables like {SERIE}
 *  2. Remove query strings
 *  3. Collapse consecutive slashes (preserving protocol ://)
 *  4. Remove trailing slashes
 */
function normaliseUrl(raw: string): string {
  let url = raw.trim();

  // Strip template variables: {ANYTHING}
  url = url.replace(/\{[^}]+\}/g, '');

  // Remove query string
  const qIndex = url.indexOf('?');
  if (qIndex !== -1) {
    url = url.substring(0, qIndex);
  }

  // Collapse consecutive slashes (but preserve ://)
  url = url.replace(/([^:])\/\/+/g, '$1/');

  // Remove trailing slash(es)
  url = url.replace(/\/+$/, '');

  return url;
}

const badgeStyles: Record<string, string> = {
  online:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800',
  offline:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800',
  ftp:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800',
  unknown:
    'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 ring-1 ring-neutral-200 dark:ring-neutral-700',
};

const dotStyles: Record<string, string> = {
  online: 'bg-emerald-500',
  offline: 'bg-red-500',
  ftp: 'bg-blue-500',
  unknown: 'bg-neutral-400',
};

const badgeLabels: Record<string, string> = {
  online: 'Online',
  offline: 'Offline',
  ftp: 'FTP',
  unknown: 'Desconhecido',
};

interface StatusBadgeProps {
  urlBase: string;
}

export function StatusBadge({ urlBase }: StatusBadgeProps) {
  const [status, setStatus] = useState<string>('unknown');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/health.json');
        if (!res.ok) return;

        const data: HealthData = await res.json();
        if (cancelled) return;

        const normalised = normaliseUrl(urlBase);
        const entry = data.results[normalised];

        if (entry) {
          setStatus(entry.status);
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('StatusBadge: failed to load /health.json', err);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [urlBase]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold ${badgeStyles[status] ?? badgeStyles.unknown}`}
    >
      <span className="relative flex h-2.5 w-2.5">
        {status === 'online' && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${dotStyles[status]}`} />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotStyles[status] ?? dotStyles.unknown}`} />
      </span>
      {badgeLabels[status] ?? badgeLabels.unknown}
    </span>
  );
}
