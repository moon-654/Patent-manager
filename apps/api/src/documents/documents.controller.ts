import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { DocumentsService } from './documents.service';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':id')
  async metadata(@Param('id') id: string) {
    return this.documentsService.getSnapshot(id);
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Query('disposition') disposition: 'inline' | 'attachment' = 'attachment',
    @Res() res: Response,
  ) {
    const { snapshot, buffer } = await this.documentsService.readFile(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(snapshot.fileName)}"`,
    );
    return res.send(buffer);
  }
}
