import { Module } from '@nestjs/common';
import { ScreensController } from './screens.controller';
import { ScreensService } from './screens.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Screen } from '../../entities/screen.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Screen]),UserModule],
  controllers: [ScreensController],
  providers: [ScreensService]
})
export class ScreensModule {}
