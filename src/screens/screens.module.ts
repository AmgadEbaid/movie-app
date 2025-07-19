import { Module } from '@nestjs/common';
import { ScreensController } from './screens.controller';
import { ScreensService } from './screens.service';

@Module({
  controllers: [ScreensController],
  providers: [ScreensService]
})
export class ScreensModule {}
