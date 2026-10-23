import {createRequire} from 'node:module';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
const require=createRequire(new URL('../packages/server/package.json',import.meta.url));
require('dotenv').config({path:new URL('../.env',import.meta.url).pathname,quiet:true});
const {Client}=require('pg');const url=new URL(process.env.DATABASE_URL);url.pathname='/postgres';
const admin=new Client({connectionString:url.toString()});await admin.connect();
const name=`sdd_agent_migration_${randomBytes(5).toString('hex')}`;let db;
function assert(value,message){if(!value)throw new Error(message);}
try{
 await admin.query(`CREATE DATABASE "${name}"`);url.pathname=`/${name}`;db=new Client({connectionString:url.toString()});await db.connect();
 await db.query('CREATE TABLE sys_application(id UUID PRIMARY KEY,tenant_id UUID NOT NULL,UNIQUE(id,tenant_id));CREATE TABLE sys_user(id UUID PRIMARY KEY,tenant_id UUID NOT NULL,UNIQUE(id,tenant_id));CREATE TABLE sys_personal_todo(id UUID PRIMARY KEY,source_message_id UUID);CREATE UNIQUE INDEX sys_todo_source_msg_key ON sys_personal_todo(source_message_id)');
 const todo=randomUUID(),message=randomUUID(),tenant=randomUUID(),application=randomUUID(),user=randomUUID();
 await db.query('INSERT INTO sys_personal_todo VALUES($1,$2)',[todo,message]);
 await db.query(readFileSync(new URL('../packages/server/prisma/migrations/20261009170000_agent_scenario_enhancement/migration.sql',import.meta.url),'utf8'));
 assert((await db.query('SELECT draft_index FROM sys_personal_todo WHERE id=$1',[todo])).rows[0].draft_index===0,'Legacy draft not retained');
 await db.query('INSERT INTO sys_personal_todo VALUES($1,$2,1)',[randomUUID(),message]);
 async function rejects(sql,values,code){let caught=false;try{await db.query(sql,values);}catch(e){if(e.code!==code)throw e;caught=true;}assert(caught,`Expected constraint ${code}`);}
 await rejects('INSERT INTO sys_personal_todo VALUES($1,$2,1)',[randomUUID(),message],'23505');
 await rejects('INSERT INTO sys_personal_todo VALUES($1,$2,12)',[randomUUID(),randomUUID()],'23514');
 await db.query('INSERT INTO sys_application VALUES($1,$2)',[application,tenant]);await db.query('INSERT INTO sys_user VALUES($1,$2)',[user,tenant]);
 const document=randomUUID();const values=[randomUUID(),document,tenant,application,user];
 const insert="INSERT INTO sys_agent_knowledge(id,document_id,tenant_id,application_id,owner_user_id,title,kind,content,revision,status) VALUES($1,$2,$3,$4,$5,'FAQ','FAQ','test',1,'ACTIVE')";
 await db.query(insert,values);await rejects(insert,[randomUUID(),document,tenant,application,user],'23505');
 await rejects(insert,[randomUUID(),randomUUID(),randomUUID(),application,user],'23503');
 console.log('PASS: legacy index 0, multiple actions, duplicate/limit checks, immutable revisions and same-tenant foreign keys');
}finally{await db?.end();await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);await admin.end();}
