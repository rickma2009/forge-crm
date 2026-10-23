import { Body,Controller,Delete,Get,Param,Patch,Post,Query,Req,UseGuards } from '@nestjs/common';
import { codeAllocationSchema,systemCodeSchema } from '@forge-crm/contracts';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AuthorizationService } from '../rbac/authorization.service';
import { NumberingService } from './numbering.service';
@Controller('api/systems/:systemCode/code-rules')
@UseGuards(SessionGuard)
export class NumberingController {
 constructor(private readonly numbers:NumberingService,private readonly auth:AuthorizationService){}
 private async allowed(r:AuthenticatedRequest,raw:string,action='view'){const code=systemCodeSchema.parse(raw);await this.auth.assertAction(r.currentUser.id,code,'system-code-rules','view');if(action!=='view')await this.auth.assertAction(r.currentUser.id,code,'system-code-rules',action);return code;}
 @Get() async list(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Query() q:Record<string,unknown>){return this.numbers.list(await this.allowed(r,c),q);}
 @Post() @UseGuards(WriteRequestGuard) async create(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Body() body:unknown){return this.numbers.save(await this.allowed(r,c,'create'),null,r.currentUser.id,body);}
 @Patch(':id') @UseGuards(WriteRequestGuard) async update(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Param('id') id:string,@Body() body:unknown){return this.numbers.save(await this.allowed(r,c,'update'),id,r.currentUser.id,body);}
 @Delete(':id') @UseGuards(WriteRequestGuard) async remove(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Param('id') id:string,@Body() body:unknown){return this.numbers.remove(await this.allowed(r,c,'delete'),id,r.currentUser.id,body);}
 @Post('allocate') @UseGuards(WriteRequestGuard) async allocate(@Req() r:AuthenticatedRequest,@Param('systemCode') c:string,@Body() body:unknown){const code=await this.allowed(r,c,'allocate'),v=codeAllocationSchema.parse(body);return {code:await this.numbers.allocate(code,v.objectCode,v.requestId)};}
}
