import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/auth/enums/user-role.enum';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('reporting')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('financial')
  getFinancialReport(@Query() query: ReportQueryDto) {
    return this.reportingService.getFinancialReport(query);
  }

  @Get('sales')
  getSalesPerformanceReport(@Query() query: ReportQueryDto) {
    return this.reportingService.getSalesPerformanceReport(query);
  }

  @Get('users')
  getUserReport(@Query() query: ReportQueryDto) {
    return this.reportingService.getUserReport(query);
  }
}


