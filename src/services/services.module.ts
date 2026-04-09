import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HbuService, HbuServiceSchema } from '../schema/hbu-service.schema';
import { User, UserSchema } from '../schema/User.schema';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HbuService.name, schema: HbuServiceSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
