import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { InventoryService } from './inventory.service';

@Controller('api/systems/:systemCode')
@UseGuards(SessionGuard)
export class InventoryController {
  constructor(private readonly service: InventoryService, private readonly auth: AuthorizationService) {}
  private code(raw: string) { return systemCodeSchema.parse(raw); }
  private allowed(request: AuthenticatedRequest, code: string, page: string, action: string) { return this.auth.assertAction(request.currentUser.id, code, page, action); }

  @Get('items') async items(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() q: Record<string, unknown>) { const c = this.code(raw); await this.allowed(r, c, 'item-directory', 'view'); return this.service.listItems(c, q); }
  @Get('items/:id') async item(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) { const c = this.code(raw); await this.allowed(r, c, 'item-directory', 'view'); return this.service.itemDetail(c, id); }
  @Post('items') @UseGuards(WriteRequestGuard) async createItem(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Body() b: unknown) { const c = this.code(raw); await this.allowed(r, c, 'item-directory', 'create'); return this.service.createItem(c, r.currentUser.account, b); }
  @Patch('items/:id') @UseGuards(WriteRequestGuard) async updateItem(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() b: unknown) { const c = this.code(raw); await this.allowed(r, c, 'item-directory', 'update'); return this.service.updateItem(c, id, r.currentUser.account, b); }

  @Get('legal-entities') async legal(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() q: Record<string, unknown>) { const c = this.code(raw); await this.allowed(r, c, 'legal-entity-admin', 'view'); return this.service.listLegalEntities(c, q); }
  @Post('legal-entities') @UseGuards(WriteRequestGuard) async createLegal(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Body() b: unknown) { const c = this.code(raw); await this.allowed(r, c, 'legal-entity-admin', 'manage'); return this.service.createLegalEntity(c, r.currentUser.account, b); }
  @Patch('legal-entities/:id') @UseGuards(WriteRequestGuard) async updateLegal(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() b: unknown) { const c = this.code(raw); await this.allowed(r, c, 'legal-entity-admin', 'manage'); return this.service.updateLegalEntity(c, id, r.currentUser.account, b); }

  @Get('warehouses') async warehouses(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() q: Record<string, unknown>) { const c = this.code(raw); await this.allowed(r, c, 'warehouse-admin', 'view'); return this.service.listWarehouses(c, q); }
  @Post('warehouses') @UseGuards(WriteRequestGuard) async createWarehouse(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Body() b: unknown) { const c = this.code(raw); await this.allowed(r, c, 'warehouse-admin', 'manage'); return this.service.createWarehouse(c, r.currentUser.account, b); }
  @Patch('warehouses/:id') @UseGuards(WriteRequestGuard) async updateWarehouse(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() b: unknown) { const c = this.code(raw); await this.allowed(r, c, 'warehouse-admin', 'manage'); return this.service.updateWarehouse(c, id, r.currentUser.account, b); }

  @Get('inbound-orders') async inbound(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() q: Record<string, unknown>) { const c = this.code(raw); await this.allowed(r, c, 'inbound-order-directory', 'view'); return this.service.listInboundOrders(c, q); }
  @Get('inbound-orders/:id') async detail(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) { const c = this.code(raw); await this.allowed(r, c, 'inbound-order-directory', 'view'); return this.service.inboundDetail(c, id); }
  @Post('inbound-orders') @UseGuards(WriteRequestGuard) async createInbound(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Body() b: unknown) { const c = this.code(raw); await this.allowed(r, c, 'inbound-order-directory', 'create'); return this.service.saveInbound(c, r.currentUser.id, r.currentUser.account, null, b); }
  @Patch('inbound-orders/:id') @UseGuards(WriteRequestGuard) async updateInbound(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() b: unknown) { const c = this.code(raw); await this.allowed(r, c, 'inbound-order-directory', 'update'); return this.service.saveInbound(c, r.currentUser.id, r.currentUser.account, id, b); }
  @Post('inbound-orders/:id/post') @UseGuards(WriteRequestGuard) async postInbound(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() b: unknown) { return this.run(r, raw, id, 'post', 'post', b); }
  @Post('inbound-orders/:id/reverse') @UseGuards(WriteRequestGuard) async reverseInbound(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() b: unknown) { return this.run(r, raw, id, 'reverse', 'reverse', b); }
  @Post('inbound-orders/:id/void') @UseGuards(WriteRequestGuard) async voidInbound(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() b: unknown) { return this.run(r, raw, id, 'void', 'void', b); }
  private async run(r: AuthenticatedRequest, raw: string, id: string, permission: string, action: 'post' | 'reverse' | 'void', b: unknown) { const c = this.code(raw); await this.allowed(r, c, 'inbound-order-directory', permission); return this.service.command(c, r.currentUser.id, r.currentUser.account, id, action, b); }

  @Get('inventory-summary') async summary(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() q: Record<string, unknown>) { const c = this.code(raw); await this.allowed(r, c, 'current-inventory-directory', 'view'); return this.service.inventorySummary(c, q); }
  @Get('inventory-balances') async balances(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() q: Record<string, unknown>) { const c = this.code(raw); await this.allowed(r, c, 'current-inventory-directory', 'view'); return this.service.listBalances(c, q); }
  @Get('inventory-transactions') async transactions(@Req() r: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() q: Record<string, unknown>) { const c = this.code(raw); await this.allowed(r, c, 'inventory-balance-directory', 'view'); return this.service.listTransactions(c, q); }
}
