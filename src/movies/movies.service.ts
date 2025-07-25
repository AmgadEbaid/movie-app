import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Movie } from '../../entities/movie.entity';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { FindMoviesQueryDto } from './dto/find-movies-query.dto';
import { S3Service } from '../s3/s3.service';
import { FindMoviesWithShowtimesQueryDto } from './dto/find-movies-with-showtimes-query.dto';

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    private readonly s3Service: S3Service,
  ) { }

  async create(createMovieDto: CreateMovieDto, file: Express.Multer.File): Promise<Movie> {
    const coverImageUrl = await this.s3Service.uploadFile(file);
    const movie = this.movieRepository.create({ ...createMovieDto, coverImageUrl });
    return this.movieRepository.save(movie);
  }

  async findAll(query: FindMoviesQueryDto): Promise<any> {
    const { search, page = 1, limit = 10 } = query;
    const queryBuilder = this.movieRepository.createQueryBuilder('movie');

    if (search) {
      queryBuilder.where('movie.title LIKE :search OR movie.description LIKE :search', { search: `%${search}%` });
    }

    const [movies, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: movies,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Movie> {
    const movie = await this.movieRepository.findOne({ where: { id }, relations: ['showtimes', 'showtimes.screen'] });
    if (!movie) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }
    return movie;
  }

  async update(id: string, updateMovieDto: UpdateMovieDto): Promise<Movie> {
    const movie = await this.findOne(id);
    const updatedMovie = Object.assign(movie, updateMovieDto);
    return this.movieRepository.save(updatedMovie);
  }

  async remove(id: string): Promise<void> {
    const result = await this.movieRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }
  }

  async findAllWithShowtimes(findMoviesWithShowtimesQuery: FindMoviesWithShowtimesQueryDto) {
    const { page = 1, limit = 10 } = findMoviesWithShowtimesQuery;
    const skip = (page - 1) * limit;

    const [movies, total] = await this.movieRepository.findAndCount({
      relations: ['showtimes'],
      where: {
        showtimes: {
          id: Not(IsNull())
        }
      },
      skip,
      take: limit,
    });

    return {
      data: movies,
      page,
      limit,
      total,
    };
  }

}
