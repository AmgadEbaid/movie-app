import { Module, Res } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Movie } from '../entities/movie.entity';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MoviesModule } from './movies/movies.module';
import { ShowtimesModule } from './showtimes/showtimes.module';
import { ReservationsModule } from './reservations/reservations.module';
import { SeatsModule } from './seats/seats.module';
import { Reservation } from 'entities/reservation.entity';
import { Showtime } from 'entities/showtime.entity';
import { Seat } from 'entities/seat.entity';
import { ScreensModule } from './screens/screens.module';
import { Screen } from 'entities/screen.entity';
import { ReservationsService } from './reservations/reservations.service';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('HOST'),
        port: configService.get<number>('PORT'),
        username: configService.get<string>('databasename'),
        password: configService.get<string>('PASSWORD'),
        database: configService.get<string>('DATABASE'),
        entities: [User, Movie,Reservation,Screen, Showtime,Seat],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    
    AuthModule,
    UserModule,
    MoviesModule,
    ScreensModule,
    ShowtimesModule,
    ReservationsModule,
    SeatsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
