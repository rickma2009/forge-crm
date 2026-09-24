import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { quotePrintHtml, renderQuotePdf } from './quotation-pdf';
import { ApiException } from '../http/api-exceptions';
import { z } from 'zod';
import { systemCodeSchema } from '@forge-crm/contracts';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { PricingService } from './pricing.service';
import { QuotationService } from './quotation.service';
import { OpportunityAmountService } from '../opportunity/opportunity-amount.service';

@Controller('api/systems/:systemCode/pricing')
@UseGuards(SessionGuard)
export class PricingController {
  constructor(private readonly service: PricingService, private readonly auth: AuthorizationService) {}
  @Get(':productId') async get(@Req() req: AuthenticatedRequest, @Param('systemCode') code: string, @Param('productId') id: string, @Query('priceId') priceId?: string, @Query('businessDate') businessDate?: string) {
    await this.auth.assertAction(req.currentUser.id, systemCodeSchema.parse(code), 'item-directory', 'price-view');
    return this.service.get(code, z.string().uuid().parse(id), z.string().uuid().optional().parse(priceId), z.string().date().optional().parse(businessDate));
  }
  @Post(':productId') @UseGuards(WriteRequestGuard) async save(@Req() req: AuthenticatedRequest, @Param('systemCode') code: string, @Param('productId') id: string, @Body() body: unknown) {
    await this.auth.assertAction(req.currentUser.id, systemCodeSchema.parse(code), 'item-directory', 'price-manage');
    return this.service.save(code, z.string().uuid().parse(id), req.currentUser.id, body);
  }
}

@Controller('api/systems/:systemCode/quotations')
@UseGuards(SessionGuard)
export class QuotationController {
  constructor(private readonly service: QuotationService, private readonly amounts: OpportunityAmountService) {}
  @Get(':id/pdf') async pdf(@Req() req: AuthenticatedRequest, @Param('systemCode') rawCode: string, @Param('id') rawId: string, @Res() response: Response) {
    const code = systemCodeSchema.parse(rawCode), id = z.string().uuid().parse(rawId);
    await this.service.scope(code, req.currentUser.id, 'export');
    const quote = await this.service.detail(code, req.currentUser.id, id);
    try { const pdf = await renderQuotePdf(quotePrintHtml(quote)); await this.service.auditExport(code, req.currentUser.id, id); response.setHeader('Content-Type', 'application/pdf'); response.setHeader('Content-Disposition', `attachment; filename="${quote.quoteCode}.pdf"`); response.setHeader('Cache-Control', 'no-store'); response.send(pdf); }
    catch { throw new ApiException('SERVICE_UNAVAILABLE', 503, 'PDF 生成失败，请确认本机 Chromium 与中文字体可用后重试'); }
  }
  @Post(':id/writeback') @UseGuards(WriteRequestGuard) writeback(@Req() req: AuthenticatedRequest, @Param('systemCode') code: string, @Param('id') id: string, @Body() body: unknown) { return this.amounts.applyQuote(systemCodeSchema.parse(code), req.currentUser.id, z.string().uuid().parse(id), body); }
  @Get() list(@Req() req: AuthenticatedRequest, @Param('systemCode') code: string, @Query() query: unknown) { return this.service.list(systemCodeSchema.parse(code), req.currentUser.id, query); }
  @Get(':id') detail(@Req() req: AuthenticatedRequest, @Param('systemCode') code: string, @Param('id') id: string) { return this.service.detail(systemCodeSchema.parse(code), req.currentUser.id, z.string().uuid().parse(id)); }
  @Post() @UseGuards(WriteRequestGuard) create(@Req() req: AuthenticatedRequest, @Param('systemCode') code: string, @Body() body: unknown) { return this.service.save(systemCodeSchema.parse(code), req.currentUser.id, null, body); }
  @Patch(':id') @UseGuards(WriteRequestGuard) save(@Req() req: AuthenticatedRequest, @Param('systemCode') code: string, @Param('id') id: string, @Body() body: unknown) { return this.service.save(systemCodeSchema.parse(code), req.currentUser.id, z.string().uuid().parse(id), body); }
  @Post(':id/copy') @UseGuards(WriteRequestGuard) copy(@Req() req: AuthenticatedRequest, @Param('systemCode') code: string, @Param('id') id: string, @Body() body: unknown) { return this.service.copy(systemCodeSchema.parse(code), req.currentUser.id, z.string().uuid().parse(id), body); }
  @Post(':id/:action') @UseGuards(WriteRequestGuard) command(@Req() req: AuthenticatedRequest, @Param('systemCode') code: string, @Param('id') id: string, @Param('action') action: string, @Body() body: unknown) { return this.service.command(systemCodeSchema.parse(code), req.currentUser.id, z.string().uuid().parse(id), z.enum(['submit', 'accept', 'reject']).parse(action), body); }
}
