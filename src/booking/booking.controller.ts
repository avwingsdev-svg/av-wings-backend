import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingService } from './booking.service';
import { CreateJetBookingDto } from './dto/create-jet-booking.dto';
import { CreateHelicopterBookingDto } from './dto/create-helicopter-booking.dto';

/** Private-client jet/helicopter booking requests and trip lists. */
@Controller('private-client')
@UseGuards(ThrottlerGuard, JwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('jet-requests')
  createJetRequest(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateJetBookingDto,
  ) {
    return this.bookingService.createJetBooking(userId, dto);
  }

  @Post('helicopter-requests')
  createHelicopterRequest(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateHelicopterBookingDto,
  ) {
    return this.bookingService.createHelicopterBooking(userId, dto);
  }

  @Get('upcoming')
  getUpcoming(@CurrentUser('userId') userId: string) {
    return this.bookingService.listUpcoming(userId);
  }

  @Get('history')
  getHistory(@CurrentUser('userId') userId: string) {
    return this.bookingService.listHistory(userId);
  }
}
