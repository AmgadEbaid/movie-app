import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie } from '../../entities/movie.entity';
import { MovieGenre } from '../../entities/movie-genre.enum';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { FindMoviesQueryDto, SortOrder } from './dto/find-movies-query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
  ) {}

  async create(createMovieDto: CreateMovieDto): Promise<Movie> {
    const movie = this.movieRepository.create(createMovieDto);
    return this.movieRepository.save(movie);
  }

  async findAll(query: FindMoviesQueryDto): Promise<PaginatedResponse<Movie>> {
    const { 
      genres, 
      search, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC
    } = query;
    
    const queryBuilder = this.movieRepository.createQueryBuilder('movie');

    // Apply search if provided
    if (search) {
      queryBuilder.where(
        '(movie.title LIKE :search OR movie.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Apply genre filtering if provided
    if (genres) {
      const genreArray = genres.split(',').map(g => g.trim());
      queryBuilder.andWhere(
        'JSON_CONTAINS(movie.genres, :genres)',
        { genres: JSON.stringify(genreArray) }
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`movie.${sortBy}`, sortOrder);

    // Count total before applying pagination
    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    // Apply pagination
    queryBuilder
      .skip((page - 1) * limit)
      .take(limit);

    // Get paginated results
    const movies = await queryBuilder.getMany();

    return {
      data: movies,
      meta: {
        total,
        page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
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
    Object.assign(movie, updateMovieDto);
    return this.movieRepository.save(movie);
  }

  async remove(id: string): Promise<void> {
    const result = await this.movieRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }
  }
}
