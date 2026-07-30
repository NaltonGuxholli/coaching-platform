import { Module } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { AdminController } from './admin.controller';

@Module({
  controllers: [AdminController],
  providers: [PlatformService],
})
export class PlatformModule {}
