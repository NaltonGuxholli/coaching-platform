import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PokService } from './pok.integration';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PokService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
