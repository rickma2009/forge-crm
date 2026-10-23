import { fetchOpinionSource, type RawOpinionItem } from './public-opinion.adapter';
import { matchOpinionItem, nextOpinionEventStatus } from './public-opinion.service';

const base:RawOpinionItem={externalId:'1',title:'MAXHUB设备质量投诉',summary:'触控故障，用户申请售后',content:'',sourceName:'测试来源',sourceUrl:'https://example.com/1',author:'',publishedAt:'2026-10-08T00:00:00.000Z',language:'zh',country:'CN'};
const topic={requiredTerms:['MAXHUB'],riskTerms:{投诉:['投诉','complaint'],质量:['质量','故障','defect']},excludedTerms:['招聘']};

describe('public opinion matching and source adapters',()=>{
 it('requires MAXHUB AND at least one risk term and honors exclusions',()=>{
  expect(matchOpinionItem(topic,base,new Date('2026-10-08T01:00:00Z').getTime())).toMatchObject({sentiment:'NEGATIVE',level:'URGENT'});
  expect(matchOpinionItem(topic,{...base,title:'其他品牌质量投诉'})).toBeNull();
  expect(matchOpinionItem(topic,{...base,title:'MAXHUB新品发布',summary:'新品上市',content:''})).toBeNull();
  expect(matchOpinionItem(topic,{...base,title:'MAXHUB质量招聘信息'})).toBeNull();
 });
 it('normalizes an RSS feed into the common evidence contract',async()=>{
  const old=global.fetch;global.fetch=jest.fn(async()=>new Response('<rss><channel><item><guid>a1</guid><title>MAXHUB quality complaint</title><description>display defect</description><link>https://news.example/a1</link><pubDate>Wed, 08 Oct 2026 00:00:00 GMT</pubDate></item></channel></rss>',{status:200})) as typeof fetch;
  try{const rows=await fetchOpinionSource({sourceCode:'rss',sourceName:'RSS',sourceType:'RSS',config:{url:'https://feed.example/rss'}},'MAXHUB',24);expect(rows[0]).toMatchObject({externalId:'a1',title:'MAXHUB quality complaint',sourceUrl:'https://news.example/a1'});}finally{global.fetch=old;}
 });
 it('rejects internal addresses in configurable sources',async()=>{
  await expect(fetchOpinionSource({sourceCode:'rss',sourceName:'RSS',sourceType:'RSS',config:{url:'https://127.0.0.1/feed'}},'MAXHUB',24)).rejects.toThrow('不能指向本机或内网地址');
 });
 it('enforces the event lifecycle instead of accepting arbitrary actions',()=>{
  expect(nextOpinionEventStatus('PENDING_REVIEW','CONFIRM')).toBe('CONFIRMED');
  expect(nextOpinionEventStatus('PROCESSING','CLOSE')).toBe('CLOSED');
  expect(nextOpinionEventStatus('CLOSED','REOPEN')).toBe('PENDING_REVIEW');
  expect(()=>nextOpinionEventStatus('PENDING_REVIEW','CLOSE')).toThrow('当前状态不允许执行该操作');
 });
});
