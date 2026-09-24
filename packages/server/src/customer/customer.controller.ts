import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { systemCodeSchema } from '@forge-crm/contracts';
import { SessionGuard } from '../auth/session.guard';
import { WriteRequestGuard } from '../auth/write-request.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AuthorizationService } from '../rbac/authorization.service';
import { CustomerService } from './customer.service';
import { RolePolicyService } from '../role-management/role-policy.service';

@Controller('api/systems/:systemCode/customers')
@UseGuards(SessionGuard)
export class CustomerController {
  constructor(private readonly customers: CustomerService, private readonly authorization: AuthorizationService, private readonly policies: RolePolicyService) {}

  private async writeScope(systemCode: string, userId: string) {
    const [read, write] = await Promise.all([this.policies.customerScope(systemCode, userId, 'read'), this.policies.customerScope(systemCode, userId, 'update')]);
    if (!read && !write) return null;
    return { where: { AND: [read?.where ?? {}, write?.where ?? {}] }, fields: [...(read?.fields ?? []), ...(write?.fields ?? [])], rules: [...(read?.rules ?? []), ...(write?.rules ?? [])] };
  }

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
    return this.customers.list(systemCode, query, await this.policies.customerScope(systemCode, request.currentUser.id, 'read'));
  }

  @Get(':id')
  async detail(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'customer-directory', 'view');
    return this.customers.detail(systemCode, id, await this.policies.customerScope(systemCode, request.currentUser.id, 'read'));
  }

  @Post()
  @UseGuards(WriteRequestGuard)
  async create(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'customer-directory', 'create');
    return this.customers.create(systemCode, request.currentUser.account, body, await this.policies.customerScope(systemCode, request.currentUser.id, 'create'));
  }

  @Patch(':id')
  @UseGuards(WriteRequestGuard)
  async update(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'customer-directory', 'update');
    return this.customers.update(systemCode, id, request.currentUser.account, body, await this.writeScope(systemCode, request.currentUser.id));
  }

  @Get(':id/contacts')
  async listContacts(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'customer-directory', 'view');
    await this.customers.assertScopedCustomer(systemCode, id, await this.policies.customerScope(systemCode, request.currentUser.id, 'read'));
    return this.customers.listContacts(systemCode, id);
  }
  @Post(':id/contacts')
  @UseGuards(WriteRequestGuard)
  async createContact(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'customer-directory', 'update');
    await this.customers.assertScopedCustomer(systemCode, id, await this.writeScope(systemCode, request.currentUser.id));
    return this.customers.createContact(systemCode, id, request.currentUser.account, body);
  }
  @Patch(':id/contacts/:contactId')
  @UseGuards(WriteRequestGuard)
  async updateContact(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Param('contactId') contactId: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'customer-directory', 'update');
    await this.customers.assertScopedCustomer(systemCode, id, await this.writeScope(systemCode, request.currentUser.id));
    return this.customers.updateContact(systemCode, id, contactId, request.currentUser.account, body);
  }

  @Get(':id/addresses')
  async listAddresses(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'customer-directory', 'view');
    await this.customers.assertScopedCustomer(systemCode, id, await this.policies.customerScope(systemCode, request.currentUser.id, 'read'));
    return this.customers.listAddresses(systemCode, id);
  }
  @Post(':id/addresses')
  @UseGuards(WriteRequestGuard)
  async createAddress(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'customer-directory', 'update');
    await this.customers.assertScopedCustomer(systemCode, id, await this.writeScope(systemCode, request.currentUser.id));
    return this.customers.createAddress(systemCode, id, request.currentUser.account, body);
  }
  @Patch(':id/addresses/:addressId')
  @UseGuards(WriteRequestGuard)
  async updateAddress(@Req() request: AuthenticatedRequest, @Param('systemCode') raw: string, @Param('id') id: string, @Param('addressId') addressId: string, @Body() body: unknown) {
    const systemCode = systemCodeSchema.parse(raw);
    await this.authorization.assertAction(request.currentUser.id, systemCode, 'customer-directory', 'update');
    await this.customers.assertScopedCustomer(systemCode, id, await this.writeScope(systemCode, request.currentUser.id));
    return this.customers.updateAddress(systemCode, id, addressId, request.currentUser.account, body);
  }
}
