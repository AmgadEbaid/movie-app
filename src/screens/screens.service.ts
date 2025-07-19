import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Screen } from '../../entities/screen.entity';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { FindScreensQueryDto, SortOrder } from './dto/find-screens-query.dto';

@Injectable()
export class ScreensService {
    constructor(
        @InjectRepository(Screen)
        private screenRepository: Repository<Screen>
    ) {}

    async create(createScreenDto: CreateScreenDto): Promise<Screen> {
        const screen = this.screenRepository.create(createScreenDto);
        return await this.screenRepository.save(screen);
    }

    async findAll(query: FindScreensQueryDto) {
        console.log('Query:', query);
        const {
            search,
            totalRows,
            seatsPerRow,
            isActive,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = SortOrder.DESC
        } = query;

        const queryBuilder = this.screenRepository.createQueryBuilder('screen');

        if (search) {
            queryBuilder.where(
                '(screen.name LIKE :search OR screen.screenType LIKE :search)',
                { search: `%${search}%` }
            );
        }

        if (totalRows) {
            queryBuilder.andWhere('screen.totalRows = :totalRows', { totalRows });
        }

        if (seatsPerRow) {
            queryBuilder.andWhere('screen.seatsPerRow = :seatsPerRow', { seatsPerRow });
        }

        if (isActive !== undefined) {
            queryBuilder.andWhere('screen.isActive = :isActive', { isActive });
        }

        const total = await queryBuilder.getCount();
        const totalPages = Math.ceil(total / limit);

        queryBuilder
            .orderBy(`screen.${sortBy}`, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);

        const screens = await queryBuilder.getMany();

        return {
            data: screens,
            meta: {
                total,
                page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        };
    }

    async findOne(id: number): Promise<Screen> {
        const screen = await this.screenRepository.findOne({ 
            where: { id },
            relations: ['showtimes']
        });
        
        if (!screen) {
            throw new NotFoundException(`Screen with ID ${id} not found`);
        }
        return screen;
    }

    async update(id: number, updateScreenDto: UpdateScreenDto): Promise<Screen> {
        const screen = await this.findOne(id);
        Object.assign(screen, updateScreenDto);
        return await this.screenRepository.save(screen);
    }

    async remove(id: number): Promise<void> {
        const screen = await this.findOne(id);
        await this.screenRepository.remove(screen);
    }
}
