import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@interaction-pattern-lab/contracts';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AuthorizationService } from '../rbac/authorization.service';
import { CustomerService } from './customer.service';

@Controller('api/systems/:systemCode/customers')
@UseGuards(SessionGuard)
export class CustomerController {
  constructor(private readonly customers: CustomerService, private readonly authorization: AuthorizationService) {}

  @Get('sales-options')
  async sales(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Query('q') query?: string) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'customer-directory', 'view');
    return this.customers.sales(query);
  }

  @Get()
  async list(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Query() query: Record<string, unknown>) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'customer-directory', 'view');
    return this.customers.list(systemCode, query);
  }

  @Get(':id')
  async detail(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'customer-directory', 'view');
    return this.customers.detail(systemCode, id);
  }

  @Post()
  @UseGuards(WriteRequestGuard)
  async create(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'customer-directory', 'create');
    return this.customers.create(systemCode, request.currentUser.account, body);
  }

  @Patch(':id')
  @UseGuards(WriteRequestGuard)
  async update(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'customer-directory', 'update');
    return this.customers.update(systemCode, id, request.currentUser.account, body);
  }
}
