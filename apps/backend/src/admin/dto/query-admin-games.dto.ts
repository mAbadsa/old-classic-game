import { IsIn, IsOptional } from 'class-validator';
import { QueryGamesDto } from '../../games/dto/query-games.dto.js';

export class QueryAdminGamesDto extends QueryGamesDto {
  @IsOptional()
  @IsIn(['date', 'rating', 'popularity'])
  sort?: 'date' | 'rating' | 'popularity';
}
