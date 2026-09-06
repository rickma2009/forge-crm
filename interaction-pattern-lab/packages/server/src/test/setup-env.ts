process.env.DATABASE_URL ??= 'postgresql://interaction_pattern_lab:local_development_only@127.0.0.1:55432/interaction_pattern_lab';
process.env.SYSTEM_CODES ??= 'demo-portal,secondary-demo';
process.env.APP_ORIGINS ??= 'http://localhost:5173';
process.env.SESSION_SIGNING_KEY ??= 'test-only-session-signing-key-000000000';
