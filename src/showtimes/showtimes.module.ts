import { Module } from '@nestjs/common';
import { ShowtimesService } from './showtimes.service';
import { ShowtimesController } from './showtimes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Showtime } from '../../entities/showtime.entity';
import { Movie } from '../../entities/movie.entity';
import { Screen } from '../../entities/screen.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Showtime, Movie, Screen]),UserModule],
  controllers: [ShowtimesController],
  providers: [ShowtimesService]
})
export class ShowtimesModule {}
