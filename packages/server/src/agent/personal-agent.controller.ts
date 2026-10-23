import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { PersonalAgentService } from './personal-agent.service';

@Controller('api/systems/:systemCode/personal-agent')
@UseGuards(SessionGuard)
export class PersonalAgentController {
  constructor(private readonly service: PersonalAgentService) {}
  @Get('conversations') list(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() query: unknown) { return this.service.list(systemCodeSchema.parse(raw), r.currentUser.id, query); }
  @Post('conversations') @UseGuards(WriteRequestGuard) create(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Body() body: unknown) { return this.service.create(systemCodeSchema.parse(raw), r.currentUser.id, body); }
  @Get('conversations/:id') detail(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) { return this.service.detail(systemCodeSchema.parse(raw), r.currentUser.id, id); }
  @Patch('conversations/:id') @UseGuards(WriteRequestGuard) update(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) { return this.service.update(systemCodeSchema.parse(raw), r.currentUser.id, id, body); }
  @Delete('conversations/:id') @UseGuards(WriteRequestGuard) remove(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) { return this.service.remove(systemCodeSchema.parse(raw), r.currentUser.id, id); }
  @Post('conversations/:id/messages') @UseGuards(WriteRequestGuard) send(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) { return this.service.send(systemCodeSchema.parse(raw), r.currentUser.id, id, body); }
  @Get('records') search(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() query: unknown) { return this.service.search(systemCodeSchema.parse(raw), r.currentUser.id, query); }
  @Get('users') users(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string) { return this.service.users(systemCodeSchema.parse(raw), r.currentUser.id); }
  @Get('todos') todos(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string) { return this.service.todos(systemCodeSchema.parse(raw), r.currentUser.id); }
  @Post('messages/:id/todo') @UseGuards(WriteRequestGuard) saveTodo(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) { return this.service.saveTodo(systemCodeSchema.parse(raw), r.currentUser.id, id, body); }
  @Patch('todos/:id') @UseGuards(WriteRequestGuard) setTodoStatus(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) { return this.service.setTodoStatus(systemCodeSchema.parse(raw), r.currentUser.id, id, body); }
  @Get('knowledge') knowledge(@Req() r:AuthenticatedRequest,@Param('systemCode') raw:string){return this.service.knowledge(systemCodeSchema.parse(raw),r.currentUser.id);}
  @Get('knowledge/:id') knowledgeDetail(@Req() r:AuthenticatedRequest,@Param('systemCode') raw:string,@Param('id') id:string){return this.service.knowledgeDetail(systemCodeSchema.parse(raw),r.currentUser.id,id);}
  @Post('knowledge') @UseGuards(WriteRequestGuard) saveKnowledge(@Req() r:AuthenticatedRequest,@Param('systemCode') raw:string,@Body() body:unknown){return this.service.saveKnowledge(systemCodeSchema.parse(raw),r.currentUser.id,body);}

}
