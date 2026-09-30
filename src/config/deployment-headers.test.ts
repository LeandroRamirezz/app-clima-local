import { describe, expect, it } from 'vitest';
import config from '../../vercel.json';

interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

const allPathsRule = (config.headers as HeaderRule[]).find((rule) => rule.source === '/(.*)');
const headers = new Map(allPathsRule?.headers.map(({ key, value }) => [key.toLowerCase(), value]));

describe('cabeceras de seguridad del despliegue', () => {
  it('aplica CSP estricta a las rutas del sitio y limita connect-src a Open-Meteo', () => {
    const policy = headers.get('content-security-policy');
    expect(policy).toBeDefined();
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("style-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toMatch(/'unsafe-inline'|'unsafe-eval'/);
    const connections = policy?.match(/(?:^|;\s*)connect-src\s+([^;]+)/)?.[1]?.trim().split(/\s+/);
    expect(connections).toEqual([
      "'self'",
      'https://api.open-meteo.com',
      'https://geocoding-api.open-meteo.com',
      'https://archive-api.open-meteo.com',
      'https://air-quality-api.open-meteo.com',
    ]);
  });

  it('declara nosniff y una política de referencia explícita', () => {
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });
});
