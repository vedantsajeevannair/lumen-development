import { Module } from '@nestjs/common';
import { FieldOpsController } from './field-ops.controller';
import { FieldOpsService } from './field-ops.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [FieldOpsController],
  providers: [FieldOpsService],
  exports: [FieldOpsService],
})
export class FieldOpsModule {}
