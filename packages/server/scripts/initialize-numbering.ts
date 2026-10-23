import { config } from 'dotenv';
import { resolve } from 'node:path';
import { DatabaseService } from '../src/database/database.service';
import { initializeNumbering } from '../src/numbering/initialize-numbering';
config({path:resolve(process.cwd().endsWith('/packages/server')?resolve(process.cwd(),'../..'):process.cwd(),'.env'),quiet:true});
async function main(){const url=new URL(process.env.DATABASE_URL!);if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('LOCAL_DATABASE_REQUIRED');const db=new DatabaseService(url.toString());try{console.log(await initializeNumbering(db,'demo-portal'));}finally{await db.$disconnect();}}
void main().catch(e=>{console.error(e instanceof Error?e.message:'初始化失败');process.exitCode=1;});
