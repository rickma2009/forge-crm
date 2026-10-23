import { config } from 'dotenv';
import { deMailAutomationConfigSchema } from '@forge-crm/contracts';
import { DatabaseService } from '../src/database/database.service';

config({path:'../../.env',quiet:true});

async function main(){
 const url=new URL(process.env.DATABASE_URL!);
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('LOCAL_DATABASE_REQUIRED');
 const db=new DatabaseService(url.toString());
 try{
  const app=await db.sysApplication.findFirstOrThrow({where:{applicationCode:'demo-portal',status:'ACTIVE'}});
  const connection=await db.intDeConnection.findUniqueOrThrow({where:{applicationId_connectionCode:{applicationId:app.id,connectionCode:'mail-qq-primary'}}});
  const automation=await db.intDeMailAutomation.findUniqueOrThrow({where:{connectionId:connection.id}});
  const configValue=deMailAutomationConfigSchema.parse(automation.config);
  const [messages,rules,templates,runs,actions]=await Promise.all([
   db.intDeMailMessage.groupBy({by:['status'],where:{connectionId:connection.id},_count:{_all:true}}),
   db.intDeMailRule.count({where:{connectionId:connection.id,enabled:true}}),
   db.intDeMailTemplate.count({where:{connectionId:connection.id,status:'ACTIVE'}}),
   db.intDeMailRun.groupBy({by:['triggerType','status'],where:{connectionId:connection.id},_count:{_all:true}}),
   db.intDeMailAction.groupBy({by:['actionType','status'],where:{connectionId:connection.id},_count:{_all:true}}),
  ]);
  console.log(JSON.stringify({
   automation:{enabled:automation.enabled,intervalMinutes:configValue.intervalMinutes,outboundEnabled:configValue.outboundEnabled,lastRunAt:automation.lastRunAt?.toISOString()??null,nextRunAt:automation.nextRunAt?.toISOString()??null,lastError:automation.lastError},
   messages:messages.map(row=>({status:row.status,count:row._count._all})),rules,templates,
   runs:runs.map(row=>({triggerType:row.triggerType,status:row.status,count:row._count._all})),
   actions:actions.map(row=>({actionType:row.actionType,status:row.status,count:row._count._all})),
  }));
 }finally{await db.$disconnect();}
}

void main();
