import { Injectable, NotFoundException } from '@nestjs/common';

import { FileStorageService } from '../common/file-storage.service';
import { InMemoryStoreService } from '../common/in-memory-store.service';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly store: InMemoryStoreService,
    private readonly prisma: PrismaService,
    private readonly storage: FileStorageService,
  ) {}

  async getSnapshot(id: string) {
    const snapshot = await this.prisma.formSnapshot.findUnique({
      where: { id },
    });

    if (snapshot) {
      return {
        id: snapshot.id,
        formCode: snapshot.formCode,
        targetType: snapshot.targetType,
        targetId: snapshot.targetId,
        revisionNo: snapshot.revisionNo ?? undefined,
        title: snapshot.title,
        generatedBy: snapshot.generatedBy,
        generatedAt: snapshot.generatedAt.toISOString(),
        fileName: snapshot.fileName,
        filePath: snapshot.filePath,
        previewLines: Array.isArray(snapshot.previewLinesJson)
          ? (snapshot.previewLinesJson as string[])
          : [],
      };
    }

    const legacy = this.store.snapshot.formSnapshots.find(
      (item) => item.id === id,
    );

    if (!legacy) {
      throw new NotFoundException('문서 스냅샷을 찾을 수 없습니다.');
    }

    return legacy;
  }

  async resolveFile(id: string) {
    const snapshot = await this.getSnapshot(id);

    const exists = await this.storage.fileExists(snapshot.filePath);
    if (!exists) {
      throw new NotFoundException('생성된 PDF 파일을 찾을 수 없습니다.');
    }

    return snapshot;
  }

  async readFile(id: string) {
    const snapshot = await this.resolveFile(id);
    return {
      snapshot,
      buffer: await this.storage.readFileBuffer(snapshot.filePath),
    };
  }
}
