import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { ApiException } from '../http/api-exceptions';
import { PurchasingService } from './purchasing.service';
@Controller('api/systems/:systemCode')
@UseGuards(SessionGuard)
export class PurchasingController {
    constructor(private readonly service: PurchasingService, private readonly auth: AuthorizationService) { }
    private async scope(r: AuthenticatedRequest, raw: string, page: string, action = 'view') { const code = systemCodeSchema.parse(raw); await this.auth.assertAction(r.currentUser.id, code, page, action); return code; }
    @Get('purchasing/history/:kind/:id')
    async history(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Param('kind')
    kind: 'order' | 'receipt', 
    @Param('id')
    id: string) { if (!['order', 'receipt'].includes(kind))
        throw new ApiException('BAD_REQUEST', 400, '无效采购类型'); return this.service.history(await this.scope(r, raw, kind === 'order' ? 'purchase-order-directory' : 'purchase-receipt-directory'), kind, id); }
    @Get('purchasing/options/:kind')
    async options(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Param('kind')
    kind: string) { const pages: Record<string, string> = { supplier: 'supplier-directory', order: 'purchase-order-directory', receipt: 'purchase-receipt-directory' }; if (!pages[kind])
        throw new ApiException('BAD_REQUEST', 400, '无效采购类型'); return this.service.options(await this.scope(r, raw, pages[kind])); }
    @Get('suppliers')
    async suppliers(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Query()
    q: Record<string, unknown>) { return this.service.suppliers(await this.scope(r, raw, 'supplier-directory'), q); }
    @Get('suppliers/:id')
    async supplier(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Param('id')
    id: string) { return this.service.supplier(await this.scope(r, raw, 'supplier-directory'), id); }
    @Post('suppliers')
    @UseGuards(WriteRequestGuard)
    async createSupplier(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Body()
    body: unknown) { return this.service.saveSupplier(await this.scope(r, raw, 'supplier-directory', 'create'), r.currentUser.id, null, body); }
    @Patch('suppliers/:id')
    @UseGuards(WriteRequestGuard)
    async updateSupplier(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Param('id')
    id: string, 
    @Body()
    body: unknown) { return this.service.saveSupplier(await this.scope(r, raw, 'supplier-directory', 'update'), r.currentUser.id, id, body); }
    @Post('suppliers/:id/delete')
    @UseGuards(WriteRequestGuard)
    async deleteSupplier(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Param('id')
    id: string, 
    @Body()
    body: unknown) { return this.service.deleteSupplier(await this.scope(r, raw, 'supplier-directory', 'delete'), r.currentUser.id, id, body); }
    @Get('purchase-orders')
    async orders(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Query()
    q: Record<string, unknown>) { return this.service.orders(await this.scope(r, raw, 'purchase-order-directory'), q); }
    @Get('purchase-orders/:id')
    async order(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Param('id')
    id: string) { return this.service.order(await this.scope(r, raw, 'purchase-order-directory'), id); }
    @Post('purchase-orders')
    @UseGuards(WriteRequestGuard)
    async createOrder(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Body()
    body: unknown) { return this.service.saveOrder(await this.scope(r, raw, 'purchase-order-directory', 'create'), r.currentUser.id, null, body); }
    @Patch('purchase-orders/:id')
    @UseGuards(WriteRequestGuard)
    async updateOrder(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Param('id')
    id: string, 
    @Body()
    body: unknown) { return this.service.saveOrder(await this.scope(r, raw, 'purchase-order-directory', 'update'), r.currentUser.id, id, body); }
    @Post('purchase-orders/:id/:action')
    @UseGuards(WriteRequestGuard)
    async orderCommand(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Param('id')
    id: string, 
    @Param('action')
    action: string, 
    @Body()
    body: unknown) { if (!['submit', 'withdraw', 'approve', 'reject', 'cancel', 'close', 'delete'].includes(action))
        throw new ApiException('BAD_REQUEST', 400, '无效采购订单操作'); return this.service.command(await this.scope(r, raw, 'purchase-order-directory', action), r.currentUser.id, 'order', id, action, body); }
    @Get('purchase-receipts/sources')
    async sources(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Query()
    q: Record<string, unknown>) { const code = await this.scope(r, raw, 'purchase-receipt-directory'); return this.service.orders(code, { ...q, status: 'APPROVED' }); }
    @Get('purchase-receipts/source/:id')
    async source(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Param('id')
    id: string) { const code = await this.scope(r, raw, 'purchase-receipt-directory'); return this.service.order(code, id); }
    @Get('purchase-receipts')
    async receipts(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Query()
    q: Record<string, unknown>) { return this.service.receipts(await this.scope(r, raw, 'purchase-receipt-directory'), q); }
    @Get('purchase-receipts/:id')
    async receipt(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Param('id')
    id: string) { return this.service.receipt(await this.scope(r, raw, 'purchase-receipt-directory'), id); }
    @Post('purchase-receipts')
    @UseGuards(WriteRequestGuard)
    async createReceipt(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Body()
    body: unknown) { return this.service.saveReceipt(await this.scope(r, raw, 'purchase-receipt-directory', 'create'), r.currentUser.id, null, body); }
    @Patch('purchase-receipts/:id')
    @UseGuards(WriteRequestGuard)
    async updateReceipt(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Param('id')
    id: string, 
    @Body()
    body: unknown) { return this.service.saveReceipt(await this.scope(r, raw, 'purchase-receipt-directory', 'update'), r.currentUser.id, id, body); }
    @Post('purchase-receipts/:id/:action')
    @UseGuards(WriteRequestGuard)
    async receiptCommand(
    @Req()
    r: AuthenticatedRequest, 
    @Param('systemCode')
    raw: string, 
    @Param('id')
    id: string, 
    @Param('action')
    action: string, 
    @Body()
    body: unknown) { if (!['submit', 'withdraw', 'approve', 'reject', 'cancel', 'post', 'reverse', 'delete'].includes(action))
        throw new ApiException('BAD_REQUEST', 400, '无效采购入库操作'); return this.service.command(await this.scope(r, raw, 'purchase-receipt-directory', action), r.currentUser.id, 'receipt', id, action, body); }
}
