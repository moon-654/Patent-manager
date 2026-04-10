import { Global, Module } from '@nestjs/common';

import { AccessControlService } from './access-control.service';
import { AuditService } from './audit.service';
import { DatabaseBootstrapService } from './database-bootstrap.service';
import { DocumentService } from './document.service';
import { FileStorageService } from './file-storage.service';
import { InMemoryStoreService } from './in-memory-store.service';
import { NotificationsService } from './notifications.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    DatabaseBootstrapService,
    InMemoryStoreService,
    AuditService,
    NotificationsService,
    DocumentService,
    FileStorageService,
    AccessControlService,
  ],
  exports: [
    PrismaService,
    InMemoryStoreService,
    AuditService,
    NotificationsService,
    DocumentService,
    FileStorageService,
    AccessControlService,
  ],
})
export class CommonModule {}
