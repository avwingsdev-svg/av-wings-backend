import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { BookingModule } from './booking/booking.module';
import { MarketModule } from './market/market.module';
import { ServicesModule } from './services/services.module';

@Module({
  imports: [
    CloudinaryModule,
    MulterModule.register({
      storage: multer.memoryStorage(), // use in-memory buffer
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGO_URI as string),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60,
          limit: 100,
        },
        {
          //auth
          name: 'auth',
          ttl: 10,
          limit: 5,
        },
      ],
    }),
    AuthModule,
    BookingModule,
    MarketModule,
    ServicesModule,
  ],
})
export class AppModule {}
