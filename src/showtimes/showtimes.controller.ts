import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ShowtimesService } from './showtimes.service';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { AuthGuard } from '@nestjs/passport';
import { FindShowtimesQueryDto } from './dto/find-showtimes-query.dto';

@Controller('showtimes')
export class ShowtimesController {
    constructor(private readonly showtimesService: ShowtimesService) {}

    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    create(@Body() createShowtimeDto: CreateShowtimeDto) {
        return this.showtimesService.create(createShowtimeDto);
    }

    @Get()
    findAll(@Query() query: FindShowtimesQueryDto) {
        return this.showtimesService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.showtimesService.findOne(+id);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: string, @Body() updateShowtimeDto: UpdateShowtimeDto) {
        return this.showtimesService.update(+id, updateShowtimeDto);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.showtimesService.remove(+id);
    }
}