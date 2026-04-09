import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { validateUploadFile } from '../common/storage/upload-validation';
import { User, UserAccountType } from '../schema/User.schema';
import { HbuService, HbuServiceStatus } from '../schema/hbu-service.schema';
import { CreateServiceDto } from './dto/create-service.dto';
import {
  DEFAULT_LIMIT,
  ListServicesQueryDto,
} from './dto/list-services-query.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

const MAX_SERVICE_PHOTOS = 10;

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(HbuService.name)
    private readonly hbuServiceModel: Model<HbuService>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(
    ownerId: string,
    dto: CreateServiceDto,
    photos: Express.Multer.File[],
  ) {
    await this.assertHbuPartner(ownerId);
    if (!photos?.length) {
      throw new BadRequestException('At least one photo is required.');
    }
    if (photos.length > MAX_SERVICE_PHOTOS) {
      throw new BadRequestException(
        `You can upload at most ${MAX_SERVICE_PHOTOS} photos.`,
      );
    }
    const imageKeys: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      imageKeys.push(await this.storePhoto(ownerId, photos[i], `photo-${i}`));
    }
    const features = this.parseFeatures(dto.features);
    const doc = await this.hbuServiceModel.create({
      ownerId,
      homeBaseLabel: dto.homeBaseLabel.trim(),
      serviceType: dto.serviceType,
      name: dto.name.trim(),
      terminalLocation: dto.terminalLocation.trim(),
      tagline: dto.tagline?.trim() || undefined,
      features,
      imageKeys,
      status: HbuServiceStatus.OPEN,
    });
    return doc;
  }

  async listPublic(query: ListServicesQueryDto) {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const skip = query.skip ?? 0;
    const filter: Record<string, unknown> = {
      status: HbuServiceStatus.OPEN,
    };
    if (query.serviceType) {
      filter.serviceType = query.serviceType;
    }
    if (query.homeBaseLabel?.trim()) {
      filter.homeBaseLabel = {
        $regex: query.homeBaseLabel.trim(),
        $options: 'i',
      };
    }
    const [items, total] = await Promise.all([
      this.hbuServiceModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.hbuServiceModel.countDocuments(filter).exec(),
    ]);
    return {
      items,
      total,
      limit,
      skip,
    };
  }

  async getByIdPublic(id: string) {
    const doc = await this.hbuServiceModel.findById(id).exec();
    if (!doc || doc.status !== HbuServiceStatus.OPEN) {
      throw new NotFoundException('Service not found.');
    }
    return doc;
  }

  async listMine(ownerId: string) {
    await this.assertHbuPartner(ownerId);
    const items = await this.hbuServiceModel
      .find({ ownerId })
      .sort({ createdAt: -1 })
      .exec();
    return { items };
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateServiceDto,
    photos: Express.Multer.File[] | undefined,
  ) {
    await this.assertHbuPartner(ownerId);
    const doc = await this.hbuServiceModel.findById(id).exec();
    if (!doc || doc.ownerId !== ownerId) {
      throw new NotFoundException('Service not found.');
    }
    if (photos?.length) {
      if (photos.length > MAX_SERVICE_PHOTOS) {
        throw new BadRequestException(
          `You can upload at most ${MAX_SERVICE_PHOTOS} photos.`,
        );
      }
      const imageKeys: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        imageKeys.push(await this.storePhoto(ownerId, photos[i], `photo-${i}`));
      }
      doc.imageKeys = imageKeys;
    }
    if (dto.homeBaseLabel !== undefined) {
      doc.homeBaseLabel = dto.homeBaseLabel.trim();
    }
    if (dto.serviceType !== undefined) {
      doc.serviceType = dto.serviceType;
    }
    if (dto.name !== undefined) {
      doc.name = dto.name.trim();
    }
    if (dto.terminalLocation !== undefined) {
      doc.terminalLocation = dto.terminalLocation.trim();
    }
    if (dto.tagline !== undefined) {
      doc.tagline = dto.tagline.trim() || undefined;
    }
    if (dto.features !== undefined) {
      doc.features = this.parseFeatures(dto.features);
    }
    if (dto.status !== undefined) {
      doc.status = dto.status;
    }
    await doc.save();
    return doc;
  }

  async remove(ownerId: string, id: string) {
    await this.assertHbuPartner(ownerId);
    const doc = await this.hbuServiceModel.findById(id).exec();
    if (!doc || doc.ownerId !== ownerId) {
      throw new NotFoundException('Service not found.');
    }
    await doc.deleteOne();
    return { deleted: true };
  }

  private async assertHbuPartner(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new ForbiddenException('User not found.');
    }
    if (user.accountType !== UserAccountType.HBU_PARTNER) {
      throw new ForbiddenException(
        'Only HBU Partner accounts can manage airport services.',
      );
    }
  }

  private parseFeatures(raw?: string): string[] {
    if (!raw?.trim()) {
      return [];
    }
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);
  }

  private async storePhoto(
    ownerId: string,
    file: Express.Multer.File,
    fileLabel: string,
  ): Promise<string> {
    validateUploadFile(file, 'avatar');
    const r = await this.cloudinary.uploadImage(
      file.buffer,
      `services/${ownerId}`,
      fileLabel,
    );
    return r.secureUrl;
  }
}
