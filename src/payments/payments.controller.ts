import { Body, Controller, Post, UseGuards, Headers, UnauthorizedException, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentsService } from './payments.service';
import { PokService } from './pok.integration';
import { CreateOrderDto } from './dto/create-order.dto';
import { WebhookDto } from './dto/webhook.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../auth/role.enum';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService, private readonly pok: PokService) {}

  // POK checkout helper endpoint
  @Post('pok/checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.INSTRUCTOR, RoleName.STUDENT)
  @ApiBearerAuth()
  async pokCheckout(@CurrentUser() user: AuthenticatedUser, @Body() body: { orderId: string }) {
    return this.payments.startCheckout(user, body.orderId, this.pok);
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.INSTRUCTOR, RoleName.STUDENT)
  @ApiBearerAuth()
  async createOrder(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.payments.createOrder(user, dto);
  }

  @Post('webhook/pok')
  async pokWebhook(@Req() request: { rawBody?: Buffer }, @Body() payload: WebhookDto, @Headers('x-pok-signature') signature?: string) {
    if (!this.pok.verifyWebhookSignature(request.rawBody ?? Buffer.from(JSON.stringify(payload)), signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    return this.payments.recordPaymentNotification(payload);
  }
}
