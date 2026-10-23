import {createRequire} from 'node:module';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
const require=createRequire(new URL('../packages/server/package.json',import.meta.url));
require('dotenv').config({path:new URL('../.env',import.meta.url).pathname,quiet:true});
const {Client}=require('pg');const url=new URL(process.env.DATABASE_URL);url.pathname='/postgres';
const admin=new Client({connectionString:url.toString()});await admin.connect();
const name=`sdd_scene_migration_${randomBytes(5).toString('hex')}`;let db;
function assert(value,message){if(!value)throw new Error(message);}
try{
 await admin.query(`CREATE DATABASE "${name}"`);url.pathname=`/${name}`;db=new Client({connectionString:url.toString()});await db.connect();
 await db.query('CREATE TABLE sys_application(id UUID PRIMARY KEY,tenant_id UUID NOT NULL,UNIQUE(id,tenant_id));CREATE TABLE sys_user(id UUID PRIMARY KEY,tenant_id UUID NOT NULL,UNIQUE(id,tenant_id));');
 await db.query(readFileSync(new URL('../packages/server/prisma/migrations/20261009190000_business_scene_workspaces/migration.sql',import.meta.url),'utf8'));
 const tenant=randomUUID(),application=randomUUID(),user=randomUUID();
 await db.query('INSERT INTO sys_application VALUES($1,$2)',[application,tenant]);await db.query('INSERT INTO sys_user VALUES($1,$2)',[user,tenant]);
 const insert="INSERT INTO sys_de_scene_workspace(id,tenant_id,application_id,scenario_code,data,created_by,updated_by,updated_at,version) VALUES($1,$2,$3,$4,'{}',$5,$5,NOW(),$6)";
 const values=[randomUUID(),tenant,application,'SCN-PO',user,1];await db.query(insert,values);
 async function rejects(v,code){let caught=false;try{await db.query(insert,v);}catch(e){if(e.code!==code)throw e;caught=true;}assert(caught,`Expected constraint ${code}`);}
 await rejects([randomUUID(),tenant,application,'SCN-PO',user,1],'23505');
 await rejects([randomUUID(),randomUUID(),application,'SCN-RMA',user,1],'23503');
 await rejects([randomUUID(),tenant,application,'UNKNOWN',user,1],'23514');
 await rejects([randomUUID(),tenant,application,'SCN-BI',user,0],'23514');
 console.log('PASS: scene uniqueness, valid scene/version, same-tenant app/user foreign keys');
}finally{await db?.end();await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);await admin.end();}
