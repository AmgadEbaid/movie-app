import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from '../../entities/reservation.entity';
import { Showtime } from '../../entities/showtime.entity';
import { Seat } from '../../entities/seat.entity';
import { User } from '../../entities/user.entity';
import { Screen } from '../../entities/screen.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Showtime, Seat, User, Screen]),UserModule],
  controllers: [ReservationsController],
  providers: [ReservationsService]
})
export class ReservationsModule {}
