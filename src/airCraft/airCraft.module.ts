import { Module } from "@nestjs/common";
import { AircraftController } from "./airCraft.controller";
import { AircraftService } from "./airCraft.service";
import { MongooseModule } from "@nestjs/mongoose";
import { Aircraft, AircraftSchema } from "@/schema/airCraft";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Aircraft.name, schema: AircraftSchema }]),
  ],    
  controllers: [AircraftController],
  providers: [AircraftService],
})
export class AircraftModule {}