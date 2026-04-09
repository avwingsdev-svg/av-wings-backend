import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateServiceDto } from './dto/create-service.dto';
import { ListServicesQueryDto } from './dto/list-services-query.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

/** HBU Partner service listings (lounge, fuel, catering, charter) for the Services app screens. */
@Controller('services')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  listPublic(@Query() query: ListServicesQueryDto) {
    return this.servicesService.listPublic(query);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser('userId') ownerId: string) {
    return this.servicesService.listMine(ownerId);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.servicesService.getByIdPublic(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('photos', 10))
  create(
    @CurrentUser('userId') ownerId: string,
    @Body() dto: CreateServiceDto,
    @UploadedFiles() photos: Express.Multer.File[],
  ) {
    return this.servicesService.create(ownerId, dto, photos ?? []);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('photos', 10))
  update(
    @CurrentUser('userId') ownerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @UploadedFiles() photos: Express.Multer.File[],
  ) {
    return this.servicesService.update(ownerId, id, dto, photos);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser('userId') ownerId: string, @Param('id') id: string) {
    return this.servicesService.remove(ownerId, id);
  }
}
