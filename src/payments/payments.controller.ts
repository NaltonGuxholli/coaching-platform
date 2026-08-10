import { Body, Controller, Post, UseGuards, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentsService } from './payments.service';
import { PokService } from './pok.integration';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService, private readonly pok: PokService) {}

  // POK checkout helper endpoint
  @Post('pok/checkout')
  async pokCheckout(@Body() body: { orderId: string }) {
    const { orderId } = body;
    const order = await this.payments['prisma'].order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    const { providerId, checkoutUrl } = await this.pok.createCheckout(order);
    await this.payments['prisma'].order.update({ where: { id: orderId }, data: { providerPaymentId: providerId } });
    return { checkoutUrl, providerId };
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  async createOrder(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.payments.createOrder(user, dto);
  }

  @Post('webhook/pok')
  async pokWebhook(@Body() payload: any, @Headers('x-pok-signature') signature?: string) {
    // verify signature (stub)
    if (!this.pok.verifyWebhookSignature(payload, signature)) {
      return { ok: false, reason: 'invalid signature' };
    }
    // expected payload to contain orderId, providerId, status
    return this.payments.recordPaymentNotification(payload);
  }
}
