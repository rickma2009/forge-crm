import { config } from 'dotenv';
import { resolve } from 'node:path';
import { deMailCenterSchema,deWorkspaceSchema } from '@forge-crm/contracts';

config({path:resolve(__dirname,'../../../.env'),quiet:true});
const origin='http://localhost:5173',systemCode='demo-portal',cookies=new Map<string,string>();

async function request(path:string,method='GET',body?:unknown,allow401=false){
 const response=await fetch(origin+path,{method,headers:{origin,cookie:[...cookies].map(([key,value])=>`${key}=${value}`).join('; '),'content-type':'application/json','x-csrf-token':cookies.get('ipl_csrf')??''},...(body===undefined?{}:{body:JSON.stringify(body)})});
 for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],split=pair.indexOf('=');if(split>0)cookies.set(pair.slice(0,split),pair.slice(split+1));}
 if(!response.ok&&!(allow401&&response.status===401))throw new Error(`${method} ${path}: HTTP ${response.status} ${await response.text()}`);
 return response;
}

async function main(){
 if(!process.env.INITIAL_ADMIN_PASSWORD)throw new Error('Local admin password is not configured');
 await request('/api/auth/session','GET',undefined,true);await request('/api/auth/login','POST',{account:'admin',password:process.env.INITIAL_ADMIN_PASSWORD});
 try{
  const root=`/api/systems/${systemCode}/digital-employees`,workspace=deWorkspaceSchema.parse(await(await request(`${root}/workspace`)).json()),connection=workspace.connections.find(row=>row.category==='MAIL');
  if(!connection)throw new Error('No mail connection found');
  const path=`${root}/connections/${encodeURIComponent(connection.code)}/mail-center`,before=deMailCenterSchema.parse(await(await request(path)).json()),task=before.tasks[0];
  if(!task)throw new Error('No mail task found');
  const changed=deMailCenterSchema.parse(await(await request(`${path}/tasks/${encodeURIComponent(task.id)}/actions`,'POST',{action:'STAR',starred:!task.starred,version:before.workspaceVersion})).json()),changedTask=changed.tasks.find(row=>row.id===task.id);
  if(!changedTask||changedTask.starred===task.starred)throw new Error('Mail task action response did not contain the updated task');
  if(changed.workspaceVersion<=before.workspaceVersion)throw new Error('Mail task workspace version did not advance');
  const restored=deMailCenterSchema.parse(await(await request(`${path}/tasks/${encodeURIComponent(task.id)}/actions`,'POST',{action:'STAR',starred:task.starred,version:changed.workspaceVersion})).json()),restoredTask=restored.tasks.find(row=>row.id===task.id);
  if(!restoredTask||restoredTask.starred!==task.starred)throw new Error('Mail task attention state was not restored');
  console.log(JSON.stringify({connectionCode:connection.code,taskId:task.id,firstVersion:before.workspaceVersion,changedVersion:changed.workspaceVersion,restoredVersion:restored.workspaceVersion,immediateResponse:true},null,2));
 }finally{await request('/api/auth/logout','POST');}
}

void main().catch(error=>{console.error(error instanceof Error?error.message:'Verification failed');process.exitCode=1;});
