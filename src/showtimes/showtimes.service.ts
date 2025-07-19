import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Not, Repository } from 'typeorm';
import { Showtime } from '../../entities/showtime.entity';
import { Movie } from '../../entities/movie.entity';
import { Screen } from '../../entities/screen.entity';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { FindShowtimesQueryDto } from './dto/find-showtimes-query.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';

@Injectable()
export class ShowtimesService {
    constructor(
        @InjectRepository(Showtime)
        private showtimeRepository: Repository<Showtime>,
        @InjectRepository(Movie)
        private movieRepository: Repository<Movie>,
        @InjectRepository(Screen)
        private screenRepository: Repository<Screen>,
    ) {}

    async create(createShowtimeDto: CreateShowtimeDto): Promise<Showtime> {
        const { movieId, screenId, startTime, price } = createShowtimeDto;

        const movie = await this.movieRepository.findOne({ where: { id: movieId } });
        if (!movie) {
            throw new NotFoundException(`Movie with ID ${movieId} not found`);
        }

        const screen = await this.screenRepository.findOne({ where: { id: screenId } });
        if (!screen) {
            throw new NotFoundException(`Screen with ID ${screenId} not found`);
        }

        const startTimeDate = new Date(startTime);
        if (startTimeDate < new Date()) {
            throw new BadRequestException('Showtime cannot be in the past.');
        }

        const endTime = new Date(startTimeDate.getTime() + (movie.duration + 30) * 60000);

        const overlappingShowtime = await this.showtimeRepository.findOne({
            where: {
                screen: { id: screenId },
                startTime: Between(startTimeDate, endTime),
            },
        });

        if (overlappingShowtime) {
            throw new ConflictException('There is an overlapping showtime on this screen at the selected time.');
        }

        const showtime = this.showtimeRepository.create({
            movie,
            screen,
            startTime: startTimeDate,
            endTime,
            price,
        });

        return await this.showtimeRepository.save(showtime);
    }

    async findAll(query: FindShowtimesQueryDto) {
        const { date, movieId, screenId, page = 1, limit = 10, sortBy = 'startTime', sortOrder = 'ASC' } = query;

        const where: any = {};
        if (date) {
            const searchDate = new Date(date);
            const nextDay = new Date(searchDate);
            nextDay.setDate(searchDate.getDate() + 1);
            where.startTime = Between(searchDate, nextDay);
        }

        if (movieId) {
            where.movie = { id: movieId };
        }

        if (screenId) {
            where.screen = { id: screenId };
        }

        const [showtimes, total] = await this.showtimeRepository.findAndCount({
            where,
            relations: ['movie', 'screen'],
            order: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            data: showtimes,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number): Promise<Showtime> {
        const showtime = await this.showtimeRepository.findOne({ where: { id }, relations: ['movie', 'screen'] });
        if (!showtime) {
            throw new NotFoundException(`Showtime with ID ${id} not found`);
        }
        return showtime;
    }


    async update(id: number, updateShowtimeDto: UpdateShowtimeDto): Promise<Showtime> {
        const showtime = await this.findOne(id);
        const { movieId, screenId, startTime, price } = updateShowtimeDto;

        const movie = movieId ? await this.movieRepository.findOne({ where: { id: movieId } }) : showtime.movie;
        if (!movie) {
            throw new NotFoundException(`Movie with ID ${movieId} not found`);
        }

        const screen = screenId ? await this.screenRepository.findOne({ where: { id: screenId } }) : showtime.screen;
        if (!screen) {
            throw new NotFoundException(`Screen with ID ${screenId} not found`);
        }

        const startTimeDate = startTime ? new Date(startTime) : showtime.startTime;
        if (startTimeDate < new Date()) {
            throw new BadRequestException('Showtime cannot be in the past.');
        }

        const endTime = new Date(startTimeDate.getTime() + (movie.duration + 30) * 60000);

        const overlappingShowtime = await this.showtimeRepository.findOne({
            where: {
                id: Not(id),
                screen: { id: screen.id },
                startTime: Between(startTimeDate, endTime),
            },
        });

        if (overlappingShowtime) {
            throw new ConflictException('There is an overlapping showtime on this screen at the selected time.');
        }

        showtime.movie = movie;
        showtime.screen = screen;
        showtime.startTime = startTimeDate;
        showtime.endTime = endTime;
        if (price) {
            showtime.price = price;
        }

        return await this.showtimeRepository.save(showtime);
    }

    async remove(id: number): Promise<void> {
        const showtime = await this.findOne(id);
        await this.showtimeRepository.remove(showtime);
    }
}