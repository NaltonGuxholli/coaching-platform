import { Module } from '@nestjs/common';
import {
  InstructorController,
  LearningController,
  PublicCatalogController,
  PublicDomainController,
  TimerController,
} from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  controllers: [
    InstructorController,
    LearningController,
    PublicCatalogController,
    PublicDomainController,
    TimerController,
  ],
  providers: [WorkflowsService],
})
export class WorkflowsModule {}
