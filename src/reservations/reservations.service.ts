import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from '../../entities/reservation.entity';
import { Showtime } from '../../entities/showtime.entity';
import { Seat } from '../../entities/seat.entity';
import { User } from '../../entities/user.entity';
import { Screen } from '../../entities/screen.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto, ReservationStatus } from './dto/update-reservation.dto';
import { SeatMapRowDto, ShowtimeSeatMapDto } from './dto/showtime-seat-map.dto';

@Injectable()
export class ReservationsService {
    constructor(
        @InjectRepository(Reservation)
        private reservationRepository: Repository<Reservation>,
        @InjectRepository(Showtime)
        private showtimeRepository: Repository<Showtime>,
        @InjectRepository(Seat)
        private seatRepository: Repository<Seat>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Screen)
        private screenRepository: Repository<Screen>,
    ) {}

    async create(userId: string, createReservationDto: CreateReservationDto): Promise<Reservation> {
        const { showtimeId, seats } = createReservationDto;

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        const showtime = await this.showtimeRepository.findOne({ where: { id: showtimeId }, relations: ['screen'] });
        if (!showtime) {
            throw new NotFoundException(`Showtime with ID ${showtimeId} not found`);
        }

        const screen = showtime.screen;
        if (!screen) {
            throw new NotFoundException(`Screen for showtime ID ${showtimeId} not found`);
        }

        const newSeats: Seat[] = [];
        for (const seatDto of seats) {
            const { rowNumber, seatNumber } = seatDto;

            // 1. Validate seat against screen dimensions
            if (rowNumber < 1 || rowNumber > screen.totalRows) {
                throw new BadRequestException(`Row number ${rowNumber} is invalid for screen ${screen.name}. Total rows: ${screen.totalRows}`);
            }
            if (seatNumber < 1 || seatNumber > screen.seatsPerRow) {
                throw new BadRequestException(`Seat number ${seatNumber} is invalid for screen ${screen.name}. Seats per row: ${screen.seatsPerRow}`);
            }

            // 2. Check if seat is already taken for this showtime
            const existingSeat = await this.seatRepository.createQueryBuilder('seat')
                .innerJoin('seat.reservation', 'reservation')
                .innerJoin('reservation.showtime', 'showtime')
                .where('seat.rowNumber = :rowNumber', { rowNumber })
                .andWhere('seat.seatNumber = :seatNumber', { seatNumber })
                .andWhere('showtime.id = :showtimeId', { showtimeId: showtime.id })
                .getOne();

            if (existingSeat) {
                throw new ConflictException(`Seat R${rowNumber}S${seatNumber} is already reserved for this showtime.`);
            }

            const seat = this.seatRepository.create({ rowNumber, seatNumber });
            newSeats.push(seat);
        }

        const reservation = this.reservationRepository.create({
            user,
            showtime,
            seats: newSeats,
            status: ReservationStatus.CONFIRMED, // Or PENDING, depending on your flow
        });

        return await this.reservationRepository.save(reservation);
    }

    async findAll(): Promise<Reservation[]> {
        return this.reservationRepository.find({ relations: ['user', 'showtime', 'seats', 'showtime.movie', 'showtime.screen'] });
    }

    async findOne(id: number): Promise<Reservation> {
        const reservation = await this.reservationRepository.findOne({ where: { id }, relations: ['user', 'showtime', 'seats', 'showtime.movie', 'showtime.screen'] });
        if (!reservation) {
            throw new NotFoundException(`Reservation with ID ${id} not found`);
        }
        return reservation;
    }

    async update(id: number, updateReservationDto: UpdateReservationDto): Promise<Reservation> {
        const reservation = await this.findOne(id);

        // Only allow status update for now
        if (updateReservationDto.status) {
            reservation.status = updateReservationDto.status;
        }

        return await this.reservationRepository.save(reservation);
    }


    async remove(userId: string, id: number): Promise<void> {
        const reservation = await this.findOne(id);

        if (reservation.user.id !== userId) {
            throw new UnauthorizedException('You are not authorized to cancel this reservation.');
        }

        const now = new Date();
        const showtimeStartTime = new Date(reservation.showtime.startTime);
        const fifteenMinutesBeforeShow = new Date(showtimeStartTime.getTime() - 15 * 60 * 1000);

        if (now >= fifteenMinutesBeforeShow) {
            throw new BadRequestException('Cannot cancel reservation less than 15 minutes before showtime or if show has already started.');
        }

        // Remove associated seats first
        await this.seatRepository.remove(reservation.seats);

        // Then remove the reservation
        await this.reservationRepository.remove(reservation);
    }

    async findUserReservations(userId: string): Promise<Reservation[]> {
        return this.reservationRepository.find({
            where: { user: { id: userId } },
            relations: ['user', 'showtime', 'seats', 'showtime.movie', 'showtime.screen'],
        });
    }

    async getShowtimeSeatMap(showtimeId: number): Promise<ShowtimeSeatMapDto> {
        const showtime = await this.showtimeRepository.findOne({
            where: { id: showtimeId },
            relations: ['screen'],
        });

        if (!showtime) {
            throw new NotFoundException(`Showtime with ID ${showtimeId} not found`);
        }

        const screen = showtime.screen;
        if (!screen) {
            throw new NotFoundException(`Screen for showtime ID ${showtimeId} not found`);
        }

        const occupiedSeats = await this.seatRepository.find({
            where: {
                reservation: { showtime: { id: showtimeId } },
            },
        });

        const seatMap: SeatMapRowDto[] = [];

        for (let i = 1; i <= screen.totalRows; i++) {
            const row: SeatMapRowDto = { rowNumber: i, seats: [] };
            for (let j = 1; j <= screen.seatsPerRow; j++) {
                const isOccupied = occupiedSeats.some(s => s.rowNumber === i && s.seatNumber === j);
                row.seats.push({ rowNumber: i, seatNumber: j, isOccupied });
            }
            seatMap.push(row);
        }

        return {
            showtimeId: showtime.id,
            screenName: screen.name,
            totalRows: screen.totalRows,
            seatsPerRow: screen.seatsPerRow,
            seatMap,
        };
    }
}