import { salesDay,dayDistance,scoreDimensions,salesFacts } from './sales-facts';
import { Prisma } from '../generated/prisma/client';
function facts(overrides:Record<string,unknown>={}){return {opp:{customerId:'c',expectedSignDate:null,currencyCode:'CNY',source:'missing',expectedAmount:new Prisma.Decimal('999.99')},latest:null,contact:null,owner:null,validProducts:[],hasRequirement:false,...overrides} as unknown as Awaited<ReturnType<typeof salesFacts>>;}
describe('sales guidance rule boundaries',()=>{
 it('uses Shanghai natural-day boundaries rather than elapsed 24-hour periods',()=>{expect(salesDay(new Date('2026-10-03T16:00:00Z'))).toBe('2026-10-04');expect(dayDistance(new Date('2026-10-03T16:00:00Z'),new Date('2026-10-03T15:59:00Z'))).toBe(1);});
 it('keeps 7/8/14/15 day activity score boundaries explicit',()=>{const now=new Date('2026-10-20T04:00:00Z');for(const [days,expected] of [[7,20],[8,10],[14,10],[15,0]])expect(scoreDimensions(facts({latest:new Date(now.getTime()-days*86400000)}),{sourceScores:{},amountThresholds:{}},now).find(x=>x.code==='activity')!.score).toBe(expected);});
 it('uses exact decimal thresholds and treats unconfigured names without inherited object properties',()=>{const f=facts();f.opp!.source='toString';const result=scoreDimensions(f,{sourceScores:{},amountThresholds:{CNY:['100','1000','10000']}});expect(result.find(x=>x.code==='amount')!.score).toBe(10);expect(result.find(x=>x.code==='source')!.score).toBe(0);});
});
