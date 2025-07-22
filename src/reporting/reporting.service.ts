import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from 'entities/reservation.entity';
import { Between, Repository } from 'typeorm';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) {}

  async getFinancialReport(query: ReportQueryDto) {
    const { totalRevenue, refundsProcessed, pendingAmount } =
      await this.calculateRevenue(query);
    const revenueByMovie = await this.getRevenueByMovie(query);

    return {
      totalRevenue,
      refundsProcessed,
      pendingAmount,
      revenueByMovie,
    };
  }

  private async getRevenueByMovie(query: ReportQueryDto) {
    const qb = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.showtime', 'showtime')
      .leftJoinAndSelect('showtime.movie', 'movie')
      .select('movie.title', 'movieTitle')
      .addSelect('SUM(reservation.totalPrice)', 'revenue')
      .where('reservation.status = :status', { status: 'completed' })
      .groupBy('movie.title');

    if (query.startDate && query.endDate) {
      qb.andWhere('reservation.createdAt BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    return qb.getRawMany();
  }

  async getSalesPerformanceReport(query: ReportQueryDto) {
    const ticketsSold = await this.getTicketsSold(query);
    const mostPopularMovies = await this.getMostPopularMovies(query);
    const leastPopularMovies = await this.getLeastPopularMovies(query);
    const showtimePerformance = await this.getShowtimePerformance(query);

    return {
      ticketsSold,
      mostPopularMovies,
      leastPopularMovies,
      showtimePerformance,
    };
  }

  private async getShowtimePerformance(query: ReportQueryDto) {
    const qb = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoin('reservation.showtime', 'showtime')
      .leftJoin('showtime.movie', 'movie')
      .leftJoin('showtime.screen', 'screen')
      .select('showtime.startTime', 'showtime')
      .addSelect('movie.title', 'movieTitle')
      .addSelect('SUM(reservation.totalPrice)', 'totalRevenue')
      .addSelect('COUNT(reservation.id)', 'reservations')
      .addSelect('SUM(reservation.numberOfSeats)', 'soldSeats')
      .addSelect('screen.totalRows * screen.seatsPerRow', 'screenCapacity')
      .where('reservation.status = :status', { status: 'completed' })
      .groupBy('showtime.startTime')
      .addGroupBy('movie.title')
      .addGroupBy('screen.totalRows')
      .addGroupBy('screen.seatsPerRow')
      .orderBy('reservations', 'DESC');

    if (query.startDate && query.endDate) {
      qb.andWhere('reservation.createdAt BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    const results = await qb.getRawMany();

    return results.map((r) => ({
      showtime: r.showtime,
      movieTitle: r.movieTitle,
      totalRevenue: parseFloat(r.totalRevenue).toFixed(2),
      reservations: parseInt(r.reservations, 10),
      seatOccupancyRate: `${parseInt(r.soldSeats, 10) || 0}/${parseInt(r.screenCapacity, 10) || 0}`,
    }));
  }

  private async getSeatOccupancyRate(query: ReportQueryDto) {
    const qb = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.showtime', 'showtime')
      .leftJoinAndSelect('showtime.screen', 'screen')
      .select('showtime.id', 'showtimeId')
      .addSelect('screen.totalRows * screen.seatsPerRow', 'screenCapacity')
      .addSelect('SUM(reservation.numberOfSeats)', 'soldSeats')
      .where('reservation.status = :status', { status: 'completed' })
      .groupBy('showtime.id')
      .addGroupBy('screen.totalRows')
      .addGroupBy('screen.seatsPerRow');

    if (query.startDate && query.endDate) {
      qb.andWhere('reservation.createdAt BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    const results = await qb.getRawMany();

    return results.map((r) => {
      const soldSeats = parseInt(r.soldSeats, 10) || 0;
      const screenCapacity = parseInt(r.screenCapacity, 10) || 0;
      return {
        showtimeId: r.showtimeId,
        occupancy: `${soldSeats}/${screenCapacity}`,
      };
    });
  }

  async getUserReport(query: ReportQueryDto) {
    const newUserRegistrations = await this.getNewUserRegistrations(query);
    const topCustomers = await this.getTopCustomers(query);
    const reservationTrends = await this.getReservationTrends(query);

    return {
      newUserRegistrations,
      topCustomers,
      reservationTrends,
    };
  }

  private async getReservationTrends(query: ReportQueryDto) {
    const qb = this.reservationRepository
      .createQueryBuilder('reservation')
      .select('reservation.status', 'status')
      .addSelect('COUNT(reservation.id)', 'count')
      .groupBy('reservation.status');

    if (query.startDate && query.endDate) {
      qb.andWhere('reservation.createdAt BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    return qb.getRawMany();
  }

  private async getTopCustomers(query: ReportQueryDto) {
    const qb = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoin('reservation.user', 'user')
      .select('user.id', 'userId')
      .addSelect('user.email', 'userEmail')
      .addSelect('SUM(reservation.totalPrice)', 'totalSpent')
      .addSelect('COUNT(reservation.id)', 'reservationsMade')
      .where('reservation.status = :status', { status: 'completed' })
      .groupBy('user.id')
      .addGroupBy('user.email')
      .orderBy('totalSpent', 'DESC');

    if (query.startDate && query.endDate) {
      qb.andWhere('reservation.createdAt BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    return qb.getRawMany();
  }

  private async getNewUserRegistrations(query: ReportQueryDto) {
    const qb = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoin('reservation.user', 'user')
      .select('user.id')
      .distinct(true)
      .where('reservation.status = :status', { status: 'completed' });

    if (query.startDate && query.endDate) {
      qb.andWhere('user.createdAt BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    return (await qb.getRawMany()).length;
  }

  private async getMostPopularMovies(query: ReportQueryDto) {
    return this.getPopularityRanking(query, 'DESC');
  }

  private async getLeastPopularMovies(query: ReportQueryDto) {
    return this.getPopularityRanking(query, 'ASC');
  }

  private async getPopularityRanking(
    query: ReportQueryDto,
    order: 'ASC' | 'DESC',
  ) {
    const qb = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoin('reservation.showtime', 'showtime')
      .leftJoin('showtime.movie', 'movie')
      .select('movie.title', 'movieTitle')
      .addSelect('SUM(reservation.numberOfSeats)', 'ticketsSold')
      .where('reservation.status = :status', { status: 'completed' })
      .groupBy('movie.title')
      .orderBy('ticketsSold', order);

    if (query.startDate && query.endDate) {
      qb.andWhere('reservation.createdAt BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    return qb.getRawMany();
  }

  private async getTicketsSold(query: ReportQueryDto) {
    const qb = this.reservationRepository
      .createQueryBuilder('reservation')
      .select('SUM(reservation.numberOfSeats)', 'ticketsSold')
      .where('reservation.status = :status', { status: 'completed' });

    if (query.startDate && query.endDate) {
      qb.andWhere('reservation.createdAt BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    if (query.movieId) {
      qb.leftJoin('reservation.showtime', 'showtime').andWhere(
        'showtime.movieId = :movieId',
        { movieId: query.movieId },
      );
    }

    const { ticketsSold } = await qb.getRawOne();
    return parseInt(ticketsSold, 10) || 0;
  }

  private async calculateRevenue(query: ReportQueryDto) {
    const qb = this.reservationRepository.createQueryBuilder('reservation');

    if (query.startDate && query.endDate) {
      qb.where('reservation.createdAt BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    const completedReservations = await qb
      .clone()
      .andWhere('reservation.status = :status', { status: 'completed' })
      .getMany();

    const refundedReservations = await qb
      .clone()
      .andWhere('reservation.status = :status', { status: 'refunded' })
      .getMany();

    const pendingReservations = await qb
      .clone()
      .andWhere('reservation.status = :status', { status: 'pending' })
      .getMany();

    const totalRevenue = completedReservations.reduce(
      (sum, res) => sum + Number(res.totalPrice),
      0,
    );
    const refundsProcessed = refundedReservations.reduce(
      (sum, res) => sum + Number(res.totalPrice),
      0,
    );

    return { totalRevenue, refundsProcessed, pendingAmount: pendingReservations.length };
  }
}
