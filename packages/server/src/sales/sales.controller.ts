import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { SalesService } from './sales.service';
import { ApiException } from '../http/api-exceptions';

@Controller('api/systems/:systemCode')
@UseGuards(SessionGuard)
export class SalesController {
  constructor(private readonly sales: SalesService, private readonly auth: AuthorizationService) {}
  private code(raw: string) { return systemCodeSchema.parse(raw); }
  private async allowed(request: AuthenticatedRequest, code: string, page: string, action: string) { await this.auth.assertAction(request.currentUser.id, code, page, action); }
  @Get('sales-orders') async orders(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() query: Record<string, unknown>) { const c = this.code(raw); await this.allowed(r, c, 'sales-order-directory', 'view'); return this.sales.listOrders(c, query); }
  @Get('sales-orders/sources/:kind') async sources(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('kind') kind: 'MANUAL' | 'OPPORTUNITY' | 'QUOTATION', @Query('keyword') keyword = '') { const c = this.code(raw); await this.allowed(r, c, 'sales-order-directory', 'view'); if (!['MANUAL', 'OPPORTUNITY', 'QUOTATION'].includes(kind)) throw new ApiException('BAD_REQUEST', 400, '无效来源'); return this.sales.sourceCandidates(c, kind, keyword); }
  @Get('sales-orders/:id') async order(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) { const c = this.code(raw); await this.allowed(r, c, 'sales-order-directory', 'view'); return this.sales.order(c, id); }
  @Post('sales-orders') @UseGuards(WriteRequestGuard) async createOrder(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Body() body: unknown) { const c = this.code(raw); await this.allowed(r, c, 'sales-order-directory', 'create'); return this.sales.saveOrder(c, r.currentUser.id, null, body); }
  @Patch('sales-orders/:id') @UseGuards(WriteRequestGuard) async updateOrder(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) { const c = this.code(raw); await this.allowed(r, c, 'sales-order-directory', 'update'); return this.sales.saveOrder(c, r.currentUser.id, id, body); }
  @Post('sales-orders/:id/:action') @UseGuards(WriteRequestGuard) async commandOrder(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Param('action') action: 'submit' | 'withdraw' | 'approve' | 'reject' | 'cancel' | 'close', @Body() body: unknown) { const c = this.code(raw); if (!['submit', 'withdraw', 'approve', 'reject', 'cancel', 'close'].includes(action)) throw new ApiException('BAD_REQUEST', 400, '无效操作'); await this.allowed(r, c, 'sales-order-directory', action); return this.sales.orderCommand(c, r.currentUser.id, id, action, body); }
  @Get('sales-outbounds') async outbounds(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() query: Record<string, unknown>) { const c = this.code(raw); await this.allowed(r, c, 'sales-outbound-directory', 'view'); return this.sales.listOutbounds(c, query); }
  @Get('sales-outbounds/:id') async outbound(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) { const c = this.code(raw); await this.allowed(r, c, 'sales-outbound-directory', 'view'); return this.sales.outbound(c, id); }
  @Post('sales-outbounds') @UseGuards(WriteRequestGuard) async createOutbound(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Body() body: unknown) { const c = this.code(raw); await this.allowed(r, c, 'sales-outbound-directory', 'create'); return this.sales.saveOutbound(c, r.currentUser.id, null, body); }
  @Patch('sales-outbounds/:id') @UseGuards(WriteRequestGuard) async updateOutbound(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) { const c = this.code(raw); await this.allowed(r, c, 'sales-outbound-directory', 'update'); return this.sales.saveOutbound(c, r.currentUser.id, id, body); }
  @Post('sales-outbounds/:id/:action') @UseGuards(WriteRequestGuard) async commandOutbound(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Param('action') action: 'submit' | 'withdraw' | 'approve' | 'reject' | 'reverse', @Body() body: unknown) { const c = this.code(raw); if (!['submit', 'withdraw', 'approve', 'reject', 'reverse'].includes(action)) throw new ApiException('BAD_REQUEST', 400, '无效操作'); await this.allowed(r, c, 'sales-outbound-directory', action); return this.sales.outboundCommand(c, r.currentUser.id, id, action, body); }
}
