import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Reservation } from '../../entities/reservation.entity';
import { Showtime } from '../../entities/showtime.entity';
import { Seat } from '../../entities/seat.entity';
import { User } from '../../entities/user.entity';
import { Screen } from '../../entities/screen.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto, ReservationStatus } from './dto/update-reservation.dto';
import { SeatMapRowDto, ShowtimeSeatMapDto } from './dto/showtime-seat-map.dto';
import { session } from 'passport';
import { formatShowtimeDescription } from 'src/utilty/descripthion';
import Stripe from 'stripe';
import { Connection } from 'typeorm'; // <--- 1. IMPORT IT HERE
const stripe = require('stripe')('sk_test_51R8lHYGbopedQbOKQUQD2NcJC9BxmUkXetI8cpa69pMffxhF2vz98BU1EruMO1EvRplbx9x7gH6oPrmWgfJPiT5H00zxNEpvJf');

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
        private readonly connection: Connection,

    ) { }

    async create(userId: string, createReservationDto: CreateReservationDto): Promise<Reservation> {
        const { showtimeId, seats } = createReservationDto;

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        const showtime = await this.showtimeRepository.findOne({ where: { id: showtimeId }, relations: { movie: true, screen: true } });
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
            status: ReservationStatus.PENDING, // Or PENDING, depending on your flow
        });
        reservation.totalPrice = showtime.price * newSeats.length; // Assuming price is per seat
        reservation.numberOfSeats = newSeats.length;


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


    async refund(userId: string, id: number): Promise<void> {
        await this.connection.transaction(async (entityManager: EntityManager) => {
            const reservation = await entityManager.findOne(Reservation, {
                where: { id },
                relations: ['user', 'showtime', 'seats'],
            });

            if (!reservation) {
                throw new NotFoundException(`Reservation with ID ${id} not found`);
            }

            if (reservation.user.id !== userId) {
                throw new UnauthorizedException('You are not authorized to cancel this reservation.');
            }
            if (reservation.status !== ReservationStatus.completed) {
                throw new BadRequestException('Only completed reservations can be refund.');
            }

            const now = new Date();
            const showtimeStartTime = new Date(reservation.showtime.startTime);
            const fifteenMinutesBeforeShow = new Date(showtimeStartTime.getTime() - 15 * 60 * 1000);

            if (now >= fifteenMinutesBeforeShow) {
                throw new BadRequestException('Cannot cancel reservation less than 15 minutes before showtime or if show has already started.');
            }

            const refund = await stripe.refunds.create({
                charge: reservation.latest_charge, // Use the payment intent ID from the reservation
            });

            if (!refund) {
                throw new BadRequestException('Refund failed');
            }

            if (reservation.seats && reservation.seats.length > 0) {
                await entityManager.remove(reservation.seats);
            }

            reservation.status = ReservationStatus.REFUNDED;
            reservation.seats = []; // Clear the in-memory array

            await entityManager.save(reservation);
        });
    }

    async cancelReservation(userId: string, id: number): Promise<void> {

        const expiredSession = await this.connection.transaction(async (entityManager: EntityManager) => {
            // 1. Fetch all entities using the transaction's entity manager
            const reservation = await entityManager.findOne(Reservation, { // 2 arguments
                where: { id: id }, // <-- The ID goes inside the 'where' property
                relations: ['user', 'showtime', 'seats'],
            });

            // 2. Perform all your validation checks
            if (!reservation) {
                throw new NotFoundException('Reservation not found.');
            }
            if (reservation.user.id !== userId) {
                throw new UnauthorizedException('You are not authorized to cancel this reservation.');
            }
            // ... other checks ...

            // 3. Remove the seats FROM THE DATABASE using the same entity manager
            // This is a direct, explicit command within the transaction
            if (reservation.seats && reservation.seats.length > 0) {
                await entityManager.remove(reservation.seats);
            }
            const expiredSession = await stripe.checkout.sessions.expire(reservation.sessionId);


            // 4. Update the parent entity's state
            reservation.status = ReservationStatus.CANCELLED;

            // 5. IMPORTANT: Clear the in-memory array so the final save doesn't get confused
            reservation.seats = [];

            // 6. Save the final state of the parent entity
            await entityManager.save(reservation);
            return expiredSession
        });

        return expiredSession;

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


    async Payment(reservation: Reservation) {
        const YOUR_DOMAIN = 'http://localhost:3001'; // Replace with your actual domain
        const description = formatShowtimeDescription(reservation.seats, reservation.showtime.startTime)
        const thirtyMinutesFromNow = Date.now() + 30 * 60 * 1000;

        // Stripe expects the timestamp in seconds, so we divide by 1000 and floor it.
        const expiresAtTimestamp = Math.floor(thirtyMinutesFromNow / 1000);
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    // Provide the exact Price ID (for example, price_1234) of the product you want to sell
                    price_data: {
                        currency: 'usd', // Or 'eur', 'gbp', etc.
                        // IMPORTANT: The amount must be in the smallest currency unit (e.g., cents for USD).
                        // So, $19.99 becomes 1999.
                        unit_amount: reservation.showtime.price * 100, // Convert to cents
                        product_data: {
                            name: `${reservation.showtime.movie.title} Reservation`, // Custom name
                            description: description, // Custom description
                            images: [reservation.showtime.movie.coverImageUrl], // Use a default image if none provided
                        },
                    },
                    quantity: reservation.seats.length,


                },
            ],
            metadata: {
                // Pass your internal reservation ID to Stripe
                reservation_id: reservation.id,
                // You can add any other useful data too
                user_id: reservation.user.id
            },
            mode: 'payment',
            success_url: `${YOUR_DOMAIN}/success.html`,
            cancel_url: `${YOUR_DOMAIN}/cancel.html`,
            expires_at: expiresAtTimestamp,

        });
        reservation.stripeSessionUrl = session.url;
        reservation.sessionId = session.id;
        this.reservationRepository.save(reservation);
        return session.url;
    }

    async expireReservation(reservationId: number) {
        await this.connection.transaction(async (entityManager: EntityManager) => {
            console.log(`Expiring reservation with ID: ${reservationId}`);

            const reservation = await entityManager.findOne(Reservation, {
                where: { id: reservationId },
                relations: ['seats'],
            });

            if (!reservation) {
                throw new NotFoundException(`Reservation with ID ${reservationId} not found`);
            }

            if (reservation.seats && reservation.seats.length > 0) {
                await entityManager.remove(reservation.seats);
            }

            reservation.status = ReservationStatus.CANCELLED; // Or any other status you want to set
            reservation.seats = []; // Clear the in-memory array

            await entityManager.save(reservation);
        });
    }

    async confirmReservation(reservationId: number, latest_charge: string) {
        console.log(`Confirming reservation with ID: ${reservationId}`);
        const reservation = await this.reservationRepository.findOne({
            where: { id: reservationId },
            relations: ['seats'],
        });
        if (!reservation) {
            throw new NotFoundException(`Reservation with ID ${reservationId} not found`);
        }
        reservation.status = ReservationStatus.completed;
        reservation.latest_charge = latest_charge
        return this.reservationRepository.save(reservation)// Or any other status you want to set
    }

    async confirmRfund(reservationId: number) {
        console.log(`Confirming reservation with ID: ${reservationId}`);
        const reservation = await this.reservationRepository.findOne({
            where: { id: reservationId },
            relations: ['seats'],
        });
        if (!reservation) {
            throw new NotFoundException(`Reservation with ID ${reservationId} not found`);
        }
        reservation.status = ReservationStatus.REFUNDED;
        return this.reservationRepository.save(reservation)// Or any other status you want to set
    }


    async getRevenue(): Promise<{ totalRevenue: number }> {
        const { totalRevenue } = await this.reservationRepository
            .createQueryBuilder('reservation')
            .select('SUM(reservation.totalPrice)', 'totalRevenue')
            .where('reservation.status = :status', { status: ReservationStatus.completed })
            .getRawOne();

        return { totalRevenue: parseFloat(totalRevenue) || 0 };
    }



}