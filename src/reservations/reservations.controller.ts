import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ParseIntPipe, Res, BadRequestException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import Stripe from 'stripe';

@Controller('reservations')
@UseGuards(AuthGuard('jwt'))
export class ReservationsController {
    constructor(private readonly reservationsService: ReservationsService) { }

    @Post()
    async create(@Req() req, @Body() createReservationDto: CreateReservationDto) {
        const Reservation = await this.reservationsService.create(req.user.id, createReservationDto);
        const sessionUrl = await this.reservationsService.Payment(Reservation);
        return { sessionUrl };
    }



    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    findAll() {
        return this.reservationsService.findAll();
    }

    @Get('my-reservations')
    findMyReservations(@Req() req) {
        return this.reservationsService.findUserReservations(req.user.id);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.reservationsService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    update(@Param('id', ParseIntPipe) id: number, @Body() updateReservationDto: UpdateReservationDto) {
        return this.reservationsService.update(id, updateReservationDto);
    }

    @Post('refund/:id')
    refund(@Req() req, @Param('id', ParseIntPipe) id: number) {
        return this.reservationsService.refund(req.user.id, id);
    }

    @Post('cancelReservation/:id')
    cancelReservation(@Req() req, @Param('id', ParseIntPipe) id: number) {
        return this.reservationsService.cancelReservation(req.user.id, id);
    }

    @Get('seat-map/:showtimeId')
    getShowtimeSeatMap(@Param('showtimeId', ParseIntPipe) showtimeId: number) {
        return this.reservationsService.getShowtimeSeatMap(showtimeId);
    }

    @Get('revenue')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    getRevenue() {
        return this.reservationsService.getRevenue();
    }

    // This is your webhook controller/service function

}