import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserAccountType } from '../schema/User.schema';
import {
  BookingRequest,
  BookingStatus,
  BookingType,
} from '../schema/booking-request.schema';
import { CreateJetBookingDto } from './dto/create-jet-booking.dto';
import { CreateHelicopterBookingDto } from './dto/create-helicopter-booking.dto';

// Booking service for private clients to create and manage jet and helicopter trip requests; separate from
@Injectable()
export class BookingService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(BookingRequest.name)
    private readonly bookingModel: Model<BookingRequest>,
  ) {}

  // Persists a jet request including optional empty-leg preference; only private-client users.
  async createJetBooking(userId: string, dto: CreateJetBookingDto) {
    const user = await this.requirePrivateClient(userId);
    const booking = await this.bookingModel.create({
      userId: user._id.toString(),
      bookingType: BookingType.PRIVATE_JET,
      fromLocation: dto.fromLocation.trim(),
      toLocation: dto.toLocation.trim(),
      travelDateTime: new Date(dto.travelDateTime),
      pax: dto.pax,
      showEmptyLegOnly: dto.showEmptyLegOnly,
      status: BookingStatus.PENDING,
    });

    return booking;
  }

  // Helicopter flow omits empty-leg flag (not applicable); otherwise same as jet creation.
  async createHelicopterBooking(
    userId: string,
    dto: CreateHelicopterBookingDto,
  ) {
    const user = await this.requirePrivateClient(userId);
    const booking = await this.bookingModel.create({
      userId: user._id.toString(),
      bookingType: BookingType.HELICOPTER,
      fromLocation: dto.fromLocation.trim(),
      toLocation: dto.toLocation.trim(),
      travelDateTime: new Date(dto.travelDateTime),
      pax: dto.pax,
      showEmptyLegOnly: false,
      status: BookingStatus.PENDING,
    });

    return booking;
  }

  // Future travel dates, excluding cancelled rows, capped for the home/upcoming list UI.
  async listUpcoming(userId: string) {
    await this.requirePrivateClient(userId);
    const now = new Date();
    const bookings = await this.bookingModel
      .find({
        userId,
        travelDateTime: { $gte: now },
        status: { $ne: BookingStatus.CANCELLED },
      })
      .sort({ travelDateTime: 1 })
      .limit(20)
      .exec();

    return { items: bookings };
  }

// Past travel dates plus any cancelled rows, capped for the history list UI.
  async listHistory(userId: string) {
    await this.requirePrivateClient(userId);
    const now = new Date();
    const bookings = await this.bookingModel
      .find({
        userId,
        $or: [
          { travelDateTime: { $lt: now } },
          { status: BookingStatus.CANCELLED },
        ],
      })
      .sort({ travelDateTime: -1 })
      .limit(50)
      .exec();

    return { items: bookings };
  }


  // Booking details view for the mobile app; only accessible to the booking owner.
  private async requirePrivateClient(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (user.accountType !== UserAccountType.PRIVATE_CLIENT_BROKER) {
      throw new BadRequestException(
        'This booking flow is available for Private clients/Broker account type only.',
      );
    }
    return user;
  }
}
