import { IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadProofDto {
  @ApiProperty({
    description: 'URL of the uploaded payment proof screenshot',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/payments/proof.jpg',
  })
  @IsNotEmpty()
  @IsUrl()
  proofScreenshotUrl: string;
}
