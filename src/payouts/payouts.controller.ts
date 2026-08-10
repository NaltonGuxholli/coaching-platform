import { Controller, Get, Post, UseGuards, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PayoutsService } from './payouts.service';

@ApiTags('Payouts')
@Controller('instructor/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.payouts.listForTenant(user);
  }

  @Post('schedule')
  async schedule(@CurrentUser() user: AuthenticatedUser, @Body() body: { amountCents: number; currency?: string }) {
    return this.payouts.schedulePayout(user, body.amountCents / 100, body.currency);
  }

  @Get('export')
  async export(@CurrentUser() user: AuthenticatedUser) {
    const csv = await this.payouts.exportCsv(user);
    return { csv };
  }
}
