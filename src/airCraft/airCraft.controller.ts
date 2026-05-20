import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";

import { FileInterceptor } from "@nestjs/platform-express";


import { CreateAircraftDto } from "./dto/create.airCraft.dto";
import { UpdateAircraftDto } from "./dto/update.airCraft.dto";
import { AircraftService } from "./airCraft.service";

@Controller("aircrafts")
export class AircraftController {
  constructor(private readonly aircraftService: AircraftService) {}

  @Post("/post-aircraft")
  @UseInterceptors(FileInterceptor("photo"))
  async create(
    @Body() dto: CreateAircraftDto,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    // NOTE: userId should usually come from auth token (req.user)
    // const userId = dto["userId"];

    return this.aircraftService.create(dto, photo);
  }

  // GET ALL AIRCRAFTS
  @Get("/all-aircrafts")
  async findAll() {
    return this.aircraftService.findAll();
  }

  // GET SINGLE AIRCRAFT
  @Get("/aircraft/:id")
  async findOne(@Param("id") id: string) {
    return this.aircraftService.findOne(id);
  }

  // UPDATE AIRCRAFT (optional photo)
  @Put("/update/:id")
  @UseInterceptors(FileInterceptor("photo"))
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateAircraftDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.aircraftService.update(id, dto, photo);
  }

  // DELETE AIRCRAFT
  @Delete("/delete/:id")
  async remove(@Param("id") id: string) {
    return this.aircraftService.remove(id);
  }
}