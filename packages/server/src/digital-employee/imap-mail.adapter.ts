import { ImapFlow,type FetchMessageObject } from 'imapflow';
import { simpleParser } from 'mailparser';

export type ImapMailConfig={imapHost:string;imapPort:number;username:string;secure:boolean;lastUid:number};
export type IncomingMail={uid:number;messageId:string;subject:string;from:string;replyTo:string;receivedAt:string;summary:string;classificationText:string};

function config(raw:Record<string,unknown>):ImapMailConfig{
  const imapHost=String(raw.imapHost??'').trim(),username=String(raw.username??'').trim(),imapPort=Number(raw.imapPort),secure=String(raw.tls??'true')!=='false',lastUid=Math.max(0,Number(raw.lastUid??0)||0);
  if(!imapHost||!username||!Number.isInteger(imapPort)||imapPort<1||imapPort>65535)throw new Error('IMAP_CONFIG_INVALID');
  return{imapHost,imapPort,username,secure,lastUid};
}

function client(value:ImapMailConfig,credential:string,verifyOnly=false){return new ImapFlow({host:value.imapHost,port:value.imapPort,secure:value.secure,auth:{user:value.username,pass:credential},logger:false,verifyOnly,disableAutoIdle:true,connectionTimeout:15000,greetingTimeout:10000,socketTimeout:20000});}

export async function verifyImap(raw:Record<string,unknown>,credential:string){const value=config(raw),imap=client(value,credential,true);try{await imap.connect();}finally{if(!imap.isClosed)imap.close();}}

function sender(message:FetchMessageObject){return message.envelope?.from?.map(row=>row.name&&row.address?`${row.name} <${row.address}>`:row.address||row.name||'').filter(Boolean).join('、')||'未知发件人';}
function address(value:{value?:Array<{address?:string}>}|null|undefined){return value?.value?.find(row=>row.address)?.address?.trim().toLowerCase()??'';}
function plain(value:string){return value.replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}

export async function readRecentImap(raw:Record<string,unknown>,credential:string,limit=20):Promise<{messages:IncomingMail[];lastUid:number}>{
  const value=config(raw),imap=client(value,credential);try{
    await imap.connect();const mailbox=await imap.mailboxOpen('INBOX',{readOnly:true});if(!mailbox.exists)return{messages:[],lastUid:value.lastUid};
    const next=mailbox.uidNext??1,start=value.lastUid>0?value.lastUid+1:Math.max(1,next-limit);if(start>=next)return{messages:[],lastUid:value.lastUid};
    const fetched=await imap.fetchAll(`${start}:*`,{uid:true,envelope:true,internalDate:true,source:{maxLength:262144}},{uid:true});const messages:IncomingMail[]=[];
    for(const message of fetched.slice(-limit)){
      const parsed=message.source?await simpleParser(message.source):null,subject=parsed?.subject||message.envelope?.subject||'(无主题)',text=plain(parsed?.text||String(parsed?.html||''));
      messages.push({uid:message.uid,messageId:parsed?.messageId||message.envelope?.messageId||`uid-${message.uid}`,subject:subject.slice(0,180),from:sender(message).slice(0,180),replyTo:(address(parsed?.replyTo)||address(parsed?.from)||message.envelope?.from?.find(row=>row.address)?.address||'').slice(0,320).toLowerCase(),receivedAt:new Date(parsed?.date||message.internalDate||message.envelope?.date||Date.now()).toISOString(),summary:(text||'邮件正文为空或未能解析').slice(0,600),classificationText:`${subject}\n${text}`.slice(0,4000)});
    }
    return{messages,lastUid:Math.max(value.lastUid,...fetched.map(row=>row.uid))};
  }finally{if(!imap.isClosed){try{await imap.logout();}catch{imap.close();}}}
}

export async function moveImapMessage(raw:Record<string,unknown>,credential:string,uid:number,folder:string){const value=config(raw),imap=client(value,credential);try{await imap.connect();await imap.mailboxOpen('INBOX');await imap.messageMove(uid,folder,{uid:true});}finally{if(!imap.isClosed){try{await imap.logout();}catch{imap.close();}}}}
