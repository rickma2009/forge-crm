import { Body,Controller,Get,Param,Patch,Post,Query,Req,UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SuggestionService } from './suggestion.service';
import { ScoreService } from './score.service';
import { CommentService } from '../record-collaboration/comment.service';
import { NotificationService } from '../notification/notification.service';
import { PersonalTodoService } from '../personal-todo/personal-todo.service';
@Controller('api/systems/:systemCode/sales-interaction') @UseGuards(SessionGuard)
export class SalesEnhancementController {
 constructor(private readonly suggestions:SuggestionService,private readonly scores:ScoreService,private readonly comments:CommentService,private readonly notifications:NotificationService,private readonly todos:PersonalTodoService){}
 @Get('records/:kind/:id/suggestions') listSuggestions(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('kind')k:string,@Param('id')id:string){return this.suggestions.list(systemCodeSchema.parse(c),r.currentUser.id,k,id);}
 @Post('suggestions/:id/actions') @UseGuards(WriteRequestGuard) suggestionAction(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('id')id:string,@Body()b:unknown){return this.suggestions.action(systemCodeSchema.parse(c),r.currentUser.id,id,b);}
 @Get('records/:kind/:id/todos') listTodos(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('kind')k:string,@Param('id')id:string){return this.suggestions.recordTodos(systemCodeSchema.parse(c),r.currentUser.id,k,id);}
 @Patch('todos/:id') @UseGuards(WriteRequestGuard) todo(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('id')id:string,@Body()b:unknown){return this.todos.complete(systemCodeSchema.parse(c),r.currentUser.id,id,b);}
 @Get('scores/:id') score(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('id')id:string){return this.scores.get(systemCodeSchema.parse(c),r.currentUser.id,id);}
 @Post('scores/:id/overrides') @UseGuards(WriteRequestGuard) override(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('id')id:string,@Body()b:unknown){return this.scores.override(systemCodeSchema.parse(c),r.currentUser.id,id,b);}
 @Get('score-rules') rules(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string){return this.scores.rules(systemCodeSchema.parse(c),r.currentUser.id);}
 @Post('score-rules') @UseGuards(WriteRequestGuard) createRule(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Body()b:unknown){return this.scores.createRule(systemCodeSchema.parse(c),r.currentUser.id,b);}
 @Post('score-rules/:id/state') @UseGuards(WriteRequestGuard) ruleState(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('id')id:string,@Body()b:unknown){return this.scores.ruleAction(systemCodeSchema.parse(c),r.currentUser.id,id,b);}
 @Get('records/:kind/:id/comments') listComments(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('kind')k:string,@Param('id')id:string,@Query()q:unknown){return this.comments.list(systemCodeSchema.parse(c),r.currentUser.id,k,id,q);}
 @Get('records/:kind/:id/members') members(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('kind')k:string,@Param('id')id:string,@Query()q:unknown){return this.comments.members(systemCodeSchema.parse(c),r.currentUser.id,k,id,q);}
 @Post('records/:kind/:id/comment-drafts') @UseGuards(WriteRequestGuard) draft(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('kind')k:string,@Param('id')id:string,@Body()b:unknown){return this.comments.draft(systemCodeSchema.parse(c),r.currentUser.id,r.currentUser.account,k,id,b);}
 @Post('comments/:id') @UseGuards(WriteRequestGuard) publish(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('id')id:string,@Body()b:unknown){return this.comments.publishOrEdit(systemCodeSchema.parse(c),r.currentUser.id,id,b);}
 @Post('comments/:id/state') @UseGuards(WriteRequestGuard) commentState(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Param('id')id:string,@Body()b:unknown){return this.comments.state(systemCodeSchema.parse(c),r.currentUser.id,id,b);}
 @Get('notifications') listNotifications(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Query()q:unknown){return this.notifications.list(systemCodeSchema.parse(c),r.currentUser.id,q);}
 @Post('notifications/read') @UseGuards(WriteRequestGuard) readNotifications(@Req()r:AuthenticatedRequest,@Param('systemCode')c:string,@Body()b:unknown){return this.notifications.read(systemCodeSchema.parse(c),r.currentUser.id,b);}
}
