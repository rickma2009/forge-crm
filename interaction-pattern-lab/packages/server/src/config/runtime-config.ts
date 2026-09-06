import { systemCodeSchema } from '@interaction-pattern-lab/contracts';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '../../.env'), quiet: true });

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
};

export interface RuntimeConfig {
  databaseUrl: string;
  systemCodes: ReadonlySet<string>;
  appOrigins: ReadonlySet<string>;
  sessionSecret: string;
  previousSessionSecret?: string;
  secureCookies: boolean;
}

export const RUNTIME_CONFIG = Symbol('RUNTIME_CONFIG');

export const loadRuntimeConfig = (): RuntimeConfig => {
  const codes = required('SYSTEM_CODES').split(',').map((value) => systemCodeSchema.parse(value.trim()));
  if (new Set(codes).size !== codes.length) throw new Error('SYSTEM_CODES_DUPLICATE');
  const origins = required('APP_ORIGINS').split(',').map((value) => new URL(value.trim()).origin);
  const sessionSecret = required('SESSION_SIGNING_KEY');
  if (sessionSecret.length < 32) throw new Error('SESSION_SIGNING_KEY_TOO_SHORT');
  const previousSessionSecret = process.env.PREVIOUS_SESSION_SIGNING_KEY?.trim() || undefined;
  if (previousSessionSecret && previousSessionSecret.length < 32) throw new Error('PREVIOUS_SESSION_SIGNING_KEY_TOO_SHORT');
  return {
    databaseUrl: required('DATABASE_URL'),
    systemCodes: new Set(codes),
    appOrigins: new Set(origins),
    sessionSecret,
    previousSessionSecret,
    secureCookies: process.env.NODE_ENV === 'production',
  };
};
