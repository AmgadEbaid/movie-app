import { IsString, IsNotEmpty, IsInt, IsEnum, IsArray, IsOptional, Min, Max } from 'class-validator';
import { MovieGenre } from '../../../entities/movie-genre.enum';

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1888) // First movie ever made
  @Max(2100)
  releaseYear: number;

  @IsEnum(['G', 'PG', 'PG-13', 'R', 'NC-17'])
  rating: string;

  @IsArray()
  @IsEnum(MovieGenre, { each: true })
  @IsNotEmpty()
  genres: MovieGenre[];

  @IsString()
  @IsOptional()
  coverImageUrl?: string;
}
