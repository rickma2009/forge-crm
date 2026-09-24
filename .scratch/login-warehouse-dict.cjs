const { config } = require('../packages/server/node_modules/dotenv');
const { execFileSync } = require('node:child_process');
config({ path: '.env', quiet: true });
if (!process.env.INITIAL_ADMIN_PASSWORD) throw new Error('Missing local admin credential');
execFileSync('agent-browser', ['--session', 'warehouse-dict', 'fill', '@e5', 'admin'], { stdio: 'ignore' });
execFileSync('agent-browser', ['--session', 'warehouse-dict', 'fill', '@e6', process.env.INITIAL_ADMIN_PASSWORD], { stdio: 'ignore' });
execFileSync('agent-browser', ['--session', 'warehouse-dict', 'click', '@e7'], { stdio: 'ignore' });
console.log('Local browser login submitted');
