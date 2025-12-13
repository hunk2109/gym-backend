import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { TableAccountsService } from './table-accounts.service';
import { AddItemToAccountDto, UpdateAccountDto } from './dto/table-account.dto';

@Controller('tables/accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TableAccountsController {
  constructor(private readonly accountsService: TableAccountsService) {}

  @Post(':tableId/open')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async openAccount(@Param('tableId') tableId: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return this.accountsService.openAccount(tableId, userId);
  }

  @Get(':accountId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getAccount(@Param('accountId') accountId: string) {
    return this.accountsService.getAccountById(accountId);
  }

  @Get('table/:tableId/open')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getOpenAccountByTable(@Param('tableId') tableId: string) {
    return this.accountsService.getOpenAccountByTableId(tableId);
  }

  @Post(':accountId/items')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async addItemToAccount(
    @Param('accountId') accountId: string,
    @Body() addItemDto: AddItemToAccountDto,
  ) {
    return this.accountsService.addItemToAccount(accountId, addItemDto);
  }

  @Delete('items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async removeItemFromAccount(@Param('itemId') itemId: string) {
    return this.accountsService.removeItemFromAccount(itemId);
  }

  @Get(':accountId/total')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getCurrentTotal(@Param('accountId') accountId: string) {
    return this.accountsService.getCurrentTotal(accountId);
  }

  @Put(':accountId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async updateAccount(
    @Param('accountId') accountId: string,
    @Body() updateDto: UpdateAccountDto,
  ) {
    return this.accountsService.updateAccount(accountId, updateDto);
  }

  @Put(':accountId/close')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async closeAccount(@Param('accountId') accountId: string) {
    return this.accountsService.closeAccount(accountId);
  }

  @Put(':accountId/pay')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async completePayment(
    @Param('accountId') accountId: string,
    @Body() body: { paymentMethod?: string }
  ) {
    return this.accountsService.completePayment(accountId, body.paymentMethod);
  }

  @Put(':accountId/cancel')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async cancelAccount(@Param('accountId') accountId: string) {
    return this.accountsService.cancelAccount(accountId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getAllOpenAccounts() {
    return this.accountsService.getAllOpenAccounts();
  }
}
