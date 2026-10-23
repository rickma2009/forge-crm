import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ApiException } from '../http/api-exceptions';
const schema=z.strictObject({fingerprint:z.string(),snapshot:z.string().datetime(),at:z.string().datetime(),key:z.string().max(100)});
export type TimelineCursor=z.infer<typeof schema>;
export const timelineFingerprint=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function encodeCursor(value:TimelineCursor,secret:string) { const body=Buffer.from(JSON.stringify(value)).toString('base64url'); return body+'.'+createHmac('sha256',secret).update('activity-timeline:'+body).digest('base64url'); }
export function decodeCursor(value:string,secret:string,fingerprint:string) {
 try { const [body,signature,extra]=value.split('.'); if(!body||!signature||extra)throw new Error();
 const expected=createHmac('sha256',secret).update('activity-timeline:'+body).digest(); const actual=Buffer.from(signature,'base64url');
 if(expected.length!==actual.length||!timingSafeEqual(expected,actual))throw new Error();
 const parsed=schema.parse(JSON.parse(Buffer.from(body,'base64url').toString()));
 if(parsed.fingerprint!==fingerprint||Date.parse(parsed.snapshot)>Date.now()||Date.now()-Date.parse(parsed.snapshot)>86400000)throw new Error(); return parsed;
 }catch{throw new ApiException('BAD_REQUEST',400,'时间轴游标已失效或查询条件改变，请刷新');}
}
