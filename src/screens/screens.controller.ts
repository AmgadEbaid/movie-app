import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ScreensService } from './screens.service';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { FindScreensQueryDto } from './dto/find-screens-query.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { AuthGuard } from '@nestjs/passport';

@Controller('screens')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ScreensController {
    constructor(private readonly screensService: ScreensService) {}

    @Post()
    @Roles(UserRole.ADMIN)
    create(@Body() createScreenDto: CreateScreenDto) {
        return this.screensService.create(createScreenDto);
    }

    @Get()
    findAll(@Query() query: FindScreensQueryDto) {
        return this.screensService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.screensService.findOne(+id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: string, @Body() updateScreenDto: UpdateScreenDto) {
        return this.screensService.update(+id, updateScreenDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.screensService.remove(+id);
    }
}
