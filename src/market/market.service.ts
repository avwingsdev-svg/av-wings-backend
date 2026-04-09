import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { validateUploadFile } from '../common/storage/upload-validation';
import {
  MarketListing,
  MarketListingStatus,
} from '../schema/market-listing.schema';
import { CreateMarketListingDto } from './dto/create-market-listing.dto';
import { ListMarketListingsQueryDto } from './dto/list-market-listings-query.dto';

const DEFAULT_LIST_LIMIT = 20;
const MAX_LISTING_PHOTOS = 10;


@Injectable()
export class MarketService {
  constructor(
    @InjectModel(MarketListing.name)
    private readonly listingModel: Model<MarketListing>,
    private readonly cloudinary: CloudinaryService,
  ) {}


  async create(
    sellerId: string,
    dto: CreateMarketListingDto,
    photos: Express.Multer.File[],
  ) {
    if (!photos?.length) {
      throw new BadRequestException('At least one photo is required.');
    }
    if (photos.length > MAX_LISTING_PHOTOS) {
      throw new BadRequestException(
        `You can upload at most ${MAX_LISTING_PHOTOS} photos.`,
      );
    }
    const imageKeys: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      imageKeys.push(
        await this.storeListingPhoto(sellerId, photos[i], `photo-${i}`),
      );
    }
    const doc = await this.listingModel.create({
      sellerId,
      title: dto.title.trim(),
      category: dto.category,
      subCategory: dto.subCategory,
      condition: dto.condition,
      priceAmount: dto.priceAmount,
      priceCurrency: (dto.priceCurrency ?? 'USD').trim().toUpperCase(),
      billingPeriod: dto.billingPeriod,
      location: dto.location.trim(),
      description: dto.description.trim(),
      imageKeys,
      status: MarketListingStatus.ACTIVE,
    });
    return doc;
  }

  // Public browse feed: newest first, optional tab filters, paginated with total count.
  async listActive(query: ListMarketListingsQueryDto) {
    const limit = query.limit ?? DEFAULT_LIST_LIMIT;
    const skip = query.skip ?? 0;
    const filter: Record<string, unknown> = {
      status: MarketListingStatus.ACTIVE,
    };
    if (query.category) {
      filter.category = query.category;
    }
    if (query.subCategory) {
      filter.subCategory = query.subCategory;
    }
    const [items, total] = await Promise.all([
      this.listingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.listingModel.countDocuments(filter).exec(),
    ]);
    return {
      items,
      total,
      limit,
      skip,
    };
  }

  // Detail view hides non-active listings so sold/archived items disappear from the storefront.
  async getById(id: string) {
    const doc = await this.listingModel.findById(id).exec();
    if (!doc || doc.status !== MarketListingStatus.ACTIVE) {
      throw new NotFoundException('Listing not found.');
    }
    return doc;
  }

  // Seller dashboard: all listings for this user regardless of status.
  async listMine(sellerId: string) {
    const items = await this.listingModel
      .find({ sellerId })
      .sort({ createdAt: -1 })
      .exec();
    return { items };
  }

  // Listing photos use the same MIME/size rules as profile avatars (JPG/PNG only).
  private async storeListingPhoto(
    sellerId: string,
    file: Express.Multer.File,
    fileLabel: string,
  ): Promise<string> {
    validateUploadFile(file, 'avatar');
    const r = await this.cloudinary.uploadImage(
      file.buffer,
      `market/${sellerId}/listings`,
      fileLabel,
    );
    return r.secureUrl;
  }
}
