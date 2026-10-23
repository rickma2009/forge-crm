import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
const require = createRequire(new URL('../packages/server/package.json',import.meta.url));
require('dotenv').config({path:new URL('../.env',import.meta.url).pathname,quiet:true});
const {Client}=require('pg');
const source=new URL(process.env.DATABASE_URL);source.pathname='/postgres';const db=new Client({connectionString:source.toString()});await db.connect();
const databaseName=`sdd_purchase_${randomBytes(6).toString('hex')}`;const target=new URL(source);target.pathname=`/${databaseName}`;
const env={...process.env,DATABASE_URL:target.toString(),RUN_PURCHASE_DB_TESTS:'1',AI_PROVIDER:'mock',AI_MODEL:'mock'};
function run(args){const r=spawnSync('pnpm',['--filter','@forge-crm/server',...args],{env,stdio:'inherit',cwd:new URL('..',import.meta.url).pathname});if(r.status!==0)throw new Error(`Purchasing verification failed: ${args.join(' ')}`);}
const baselinePath=join(tmpdir(),`${databaseName}.prisma`);
let schema=readFileSync(new URL('../packages/server/prisma/schema.prisma',import.meta.url),'utf8');schema=schema.slice(0,schema.indexOf('model MdSupplier {')).replace(/.*@@unique\(\[id, tenantId\], map: "org_legal_scope_key"\).*\n/,'').replace(/.*@@unique\(\[id, tenantId, legalEntityId\], map: "scm_wh_scope_key"\).*\n/,'');writeFileSync(baselinePath,schema);
try{await db.query(`CREATE DATABASE "${databaseName}"`);run(['exec','prisma','db','push','--schema',baselinePath]);const isolated=new Client({connectionString:target.toString()});await isolated.connect();try{await isolated.query(readFileSync(new URL('../packages/server/prisma/migrations/20261011090000_purchasing/migration.sql',import.meta.url),'utf8'));}finally{await isolated.end();}run(['db:seed']);run(['exec','tsx','prisma/apply-purchasing.ts']);run(['exec','jest','--runInBand','purchasing.integration.spec.ts','purchasing-http.integration.spec.ts','purchasing-domain.spec.ts']);}
finally{unlinkSync(baselinePath);await db.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);await db.end();}
