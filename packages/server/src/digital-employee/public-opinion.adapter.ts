import { createHash } from 'node:crypto';
import { ApiException } from '../http/api-exceptions';

export type OpinionSourceRow={sourceCode:string;sourceName:string;sourceType:string;config:unknown};
export type RawOpinionItem={externalId:string;title:string;summary:string;content:string;sourceName:string;sourceUrl:string;author:string;publishedAt:string;language:string;country:string};

const text=(value:unknown)=>String(value??'').trim();
const unescapeXml=(value:string)=>value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const tag=(block:string,name:string)=>unescapeXml(block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]??'');
const valueAt=(row:unknown,path:string)=>path.split('.').reduce<unknown>((value,key)=>value&&typeof value==='object'?(value as Record<string,unknown>)[key]:undefined,row);
function safeUrl(raw:string){let url:URL;try{url=new URL(raw);}catch{throw new ApiException('BAD_REQUEST',409,'信息源地址无效');}if(url.protocol!=='https:'||url.username||url.password)throw new ApiException('BAD_REQUEST',409,'信息源必须使用不含凭证的 HTTPS 地址');const host=url.hostname.toLowerCase();if(host==='localhost'||host.endsWith('.local')||/^127\.|^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)||host==='::1')throw new ApiException('BAD_REQUEST',409,'信息源不能指向本机或内网地址');return url;}
async function get(url:URL,headers:Record<string,string>={}){const response=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok){await response.body?.cancel();throw new Error(`信息源请求失败（HTTP ${response.status}）`);}return response;}

export async function fetchOpinionSource(source:OpinionSourceRow,query:string,rangeHours:number,credential?:string):Promise<RawOpinionItem[]>{
 const config=(source.config??{}) as Record<string,unknown>,limit=Math.min(100,Math.max(1,Number(config.limit)||50));
 if(source.sourceType==='GDELT'){
  const url=new URL('https://api.gdeltproject.org/api/v2/doc/doc');url.searchParams.set('query',query);url.searchParams.set('mode','ArtList');url.searchParams.set('format','json');url.searchParams.set('maxrecords',String(limit));url.searchParams.set('timespan',`${Math.min(720,rangeHours)}h`);
  const body=await (await get(url)).json() as {articles?:Array<Record<string,unknown>>};return(body.articles??[]).map((row,index)=>({externalId:text(row.url)||`${source.sourceCode}-${index}`,title:text(row.title)||'无标题',summary:text(row.seendate),content:'',sourceName:text(row.domain)||source.sourceName,sourceUrl:text(row.url),author:text(row.sourcecountry),publishedAt:parseGdeltDate(text(row.seendate)),language:text(row.language)||'unknown',country:text(row.sourcecountry)})).filter(row=>isHttpUrl(row.sourceUrl));
 }
 if(source.sourceType==='RSS'){
  const response=await get(safeUrl(text(config.url)));const xml=await response.text();const blocks=[...xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)].slice(0,limit).map(match=>match[1]);
  return blocks.map((block,index)=>{const link=tag(block,'link')||block.match(/<link[^>]+href=["']([^"']+)/i)?.[1]||'';const published=tag(block,'pubDate')||tag(block,'published')||tag(block,'updated');return{externalId:tag(block,'guid')||tag(block,'id')||link||`${source.sourceCode}-${index}`,title:tag(block,'title')||'无标题',summary:tag(block,'description')||tag(block,'summary'),content:tag(block,'content:encoded')||tag(block,'content'),sourceName:source.sourceName,sourceUrl:link,author:tag(block,'author')||tag(block,'dc:creator'),publishedAt:validDate(published),language:text(config.language)||'zh',country:text(config.country)}}).filter(row=>isHttpUrl(row.sourceUrl));
 }
 if(source.sourceType==='NEWS_API'){
  if(!credential)throw new Error('NewsAPI 密钥尚未配置');const url=new URL('https://newsapi.org/v2/everything');url.searchParams.set('q',query);url.searchParams.set('pageSize',String(limit));url.searchParams.set('sortBy','publishedAt');url.searchParams.set('from',new Date(Date.now()-rangeHours*3600000).toISOString());
  const body=await (await get(url,{'X-Api-Key':credential})).json() as {articles?:Array<Record<string,unknown>>};return(body.articles??[]).map((row,index)=>({externalId:text(row.url)||`${source.sourceCode}-${index}`,title:text(row.title)||'无标题',summary:text(row.description),content:text(row.content),sourceName:text((row.source as Record<string,unknown>|undefined)?.name)||source.sourceName,sourceUrl:text(row.url),author:text(row.author),publishedAt:validDate(text(row.publishedAt)),language:text(config.language)||'unknown',country:text(config.country)})).filter(row=>isHttpUrl(row.sourceUrl));
 }
 if(source.sourceType==='GENERIC_REST'){
  const url=safeUrl(text(config.url));url.searchParams.set(text(config.queryParam)||'q',query);const headers:Record<string,string>={Accept:'application/json'};if(credential)headers[text(config.authHeader)||'Authorization']=text(config.authPrefix)==='none'?credential:`${text(config.authPrefix)||'Bearer'} ${credential}`;const body=await(await get(url,headers)).json();const rows=valueAt(body,text(config.itemsPath)||'items');if(!Array.isArray(rows))throw new Error('通用接口字段映射未找到数组');const mapping=(config.mapping??{}) as Record<string,string>;
  return rows.slice(0,limit).map((row,index)=>({externalId:text(valueAt(row,mapping.externalId||'id'))||`${source.sourceCode}-${index}`,title:text(valueAt(row,mapping.title||'title'))||'无标题',summary:text(valueAt(row,mapping.summary||'summary')),content:text(valueAt(row,mapping.content||'content')),sourceName:text(valueAt(row,mapping.sourceName||'sourceName'))||source.sourceName,sourceUrl:text(valueAt(row,mapping.sourceUrl||'url')),author:text(valueAt(row,mapping.author||'author')),publishedAt:validDate(text(valueAt(row,mapping.publishedAt||'publishedAt'))),language:text(valueAt(row,mapping.language||'language'))||'unknown',country:text(valueAt(row,mapping.country||'country'))})).filter(row=>isHttpUrl(row.sourceUrl));
 }
 return [];
}

export const opinionHash=(row:Pick<RawOpinionItem,'title'|'sourceUrl'>)=>createHash('sha256').update(`${row.title.trim().toLowerCase()}|${row.sourceUrl.trim().toLowerCase()}`).digest('hex');
function validDate(value:string){const date=new Date(value);return Number.isFinite(date.getTime())?date.toISOString():new Date().toISOString();}
function parseGdeltDate(value:string){const m=value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);return m?new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`).toISOString():validDate(value);}
function isHttpUrl(value:string){try{const url=new URL(value);return url.protocol==='http:'||url.protocol==='https:';}catch{return false;}}
