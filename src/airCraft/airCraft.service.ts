import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Aircraft } from "../schema/airCraft";
import { CreateAircraftDto } from "./dto/create.airCraft.dto";
import { UpdateAircraftDto } from "./dto/update.airCraft.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { validateUploadFile } from "../common/storage/upload-validation";

@Injectable()
export class AircraftService {
  constructor(
    @InjectModel(Aircraft.name)
    private readonly aircraftModel: Model<Aircraft>,

    private readonly cloudinary: CloudinaryService,
  ) {}

  // CREATE AIRCRAFT (SINGLE PHOTO)
  async create(
    dto: CreateAircraftDto,
    photo: Express.Multer.File,
  ): Promise<Aircraft> {
    const existingAircraft =
      await this.aircraftModel.findOne({
        tailNumber: dto.tailNumber.toUpperCase(),
      });

    if (existingAircraft) {
      throw new BadRequestException(
        "Aircraft with this tail number already exists",
      );
    }

    // VALIDATE SINGLE PHOTO
    if (!photo) {
      throw new BadRequestException(
        "Aircraft photo is required.",
      );
    }

    validateUploadFile(photo, "avatar");

    // UPLOAD SINGLE PHOTO
    const uploaded = await this.cloudinary.uploadImage(
      photo.buffer,
      `aircraft`,
      `photo`,
    );

    const aircraft = await this.aircraftModel.create({
      model: dto.model,
      tailNumber: dto.tailNumber,
      seats: dto.seats,
      rangeNm: dto.rangeNm,
      baseAirport: dto.baseAirport,
      hourlyRate: dto.hourlyRate,
      photo: uploaded.secureUrl, // 👈 STRING NOW
    });

    return aircraft;
  }

  // GET ALL AIRCRAFTS
  async findAll(): Promise<Aircraft[]> {
    try {
      return await this.aircraftModel
        .find()
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new BadRequestException(
        "Failed to fetch aircrafts",
      );
    }
  }

  // GET SINGLE AIRCRAFT
  async findOne(id: string): Promise<Aircraft> {
    const aircraft = await this.aircraftModel
      .findById(id)
      .exec();

    if (!aircraft) {
      throw new NotFoundException(
        "Aircraft not found",
      );
    }

    return aircraft;
  }

  // UPDATE AIRCRAFT (OPTIONAL NEW PHOTO)
  async update(
    id: string,
    dto: UpdateAircraftDto,
    photo?: Express.Multer.File,
  ): Promise<Aircraft> {
    const aircraft =
      await this.aircraftModel.findById(id);

    if (!aircraft) {
      throw new NotFoundException(
        "Aircraft not found",
      );
    }

    // CHECK TAIL NUMBER
    if (dto.tailNumber) {
      const existingTailNumber =
        await this.aircraftModel.findOne({
          tailNumber: dto.tailNumber
            .trim()
            .toUpperCase(),

          _id: { $ne: id },
        });

      if (existingTailNumber) {
        throw new BadRequestException(
          "Tail number already exists",
        );
      }
    }

    let uploadedPhoto = aircraft.photo;

    // IF NEW PHOTO PROVIDED
    if (photo) {
      validateUploadFile(photo, "avatar");

      const uploaded =
        await this.cloudinary.uploadImage(
          photo.buffer,
          `aircraft/${aircraft.id}`,
          "photo",
        );

      uploadedPhoto = uploaded.secureUrl;
    }

    const updatedAircraft =
      await this.aircraftModel.findByIdAndUpdate(
        id,
        {
          ...(dto.model && {
            model: dto.model,
          }),

          ...(dto.tailNumber && {
            tailNumber: dto.tailNumber,
          }),

          ...(dto.baseAirport && {
            baseAirport: dto.baseAirport,
          }),

          ...(dto.seats && {
            seats: dto.seats,
          }),

          ...(dto.rangeNm && {
            rangeNm: dto.rangeNm,
          }),

          ...(dto.hourlyRate && {
            hourlyRate: dto.hourlyRate,
          }),

          photo: uploadedPhoto, // 👈 SINGLE STRING
        },
        {
          new: true,
          runValidators: true,
        },
      );
      if (!updatedAircraft) {
        throw new NotFoundException(
          "Aircraft not found for update",
        );
      }

    return updatedAircraft;
  }

  // DELETE AIRCRAFT
  async remove(id: string): Promise<{
    message: string;
  }> {
    const aircraft =
      await this.aircraftModel.findById(id);

    if (!aircraft) {
      throw new NotFoundException(
        "Aircraft not found",
      );
    }

    await this.aircraftModel.findByIdAndDelete(id);

    return {
      message: "Aircraft deleted successfully",
    };
  }
}