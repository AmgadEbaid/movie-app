import { IsString, IsInt, IsEnum, IsArray, IsOptional, Min, Max } from 'class-validator';
import { MovieGenre } from '../../../entities/movie-genre.enum';

export class UpdateMovieDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  @Min(1888)
  @Max(2100)
  releaseYear?: number;

  @IsEnum(['G', 'PG', 'PG-13', 'R', 'NC-17'])
  @IsOptional()
  rating?: string;

  @IsArray()
  @IsEnum(MovieGenre, { each: true })
  @IsOptional()
  genres?: MovieGenre[];

  @IsString()
  @IsOptional()
  coverImageUrl?: string;
}
