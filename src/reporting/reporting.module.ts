import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from 'entities/reservation.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation]), UserModule],
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}

