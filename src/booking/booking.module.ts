import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import {
  BookingRequest,
  BookingRequestSchema,
} from '../schema/booking-request.schema';
import { User, UserSchema } from '../schema/User.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BookingRequest.name, schema: BookingRequestSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
