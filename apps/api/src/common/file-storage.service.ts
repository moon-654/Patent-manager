import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
} from 'fs';
import { dirname, join } from 'path';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class FileStorageService {
  private readonly backend = process.env.STORAGE_BACKEND ?? 'local';
  private readonly bucketName = process.env.GCS_BUCKET_NAME;
  private readonly prefix = process.env.STORAGE_PREFIX ?? 'generated-docs';
  private readonly apiRoot = this.resolveApiRoot();
  private readonly localRoot = join(this.apiRoot, 'tmp');
  private readonly storage = this.backend === 'gcs' ? new Storage() : null;

  constructor() {
    mkdirSync(this.localRoot, { recursive: true });
  }

  private resolveApiRoot() {
    const cwd = process.cwd();
    if (existsSync(join(cwd, 'src')) && existsSync(join(cwd, 'assets'))) {
      return cwd;
    }

    return join(cwd, 'apps', 'api');
  }

  createTempPath(fileName: string) {
    const target = join(this.localRoot, this.prefix, fileName);
    mkdirSync(dirname(target), { recursive: true });
    return target;
  }

  async persistGeneratedFile(tempPath: string, fileName: string) {
    const storagePath = `${this.prefix}/${fileName}`.replace(/\\/g, '/');

    if (this.backend === 'gcs') {
      if (!this.storage || !this.bucketName) {
        throw new InternalServerErrorException(
          'GCS storage backend is enabled but GCS_BUCKET_NAME is not configured.',
        );
      }

      await this.storage.bucket(this.bucketName).upload(tempPath, {
        destination: storagePath,
        metadata: {
          contentType: 'application/pdf',
        },
      });

      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }

      return storagePath;
    }

    const finalPath = join(this.localRoot, storagePath);
    mkdirSync(dirname(finalPath), { recursive: true });

    if (tempPath !== finalPath) {
      copyFileSync(tempPath, finalPath);
      unlinkSync(tempPath);
    }

    return storagePath;
  }

  async readFileBuffer(storagePath: string) {
    if (this.backend === 'gcs') {
      if (!this.storage || !this.bucketName) {
        throw new InternalServerErrorException(
          'GCS storage backend is enabled but GCS_BUCKET_NAME is not configured.',
        );
      }

      const [buffer] = await this.storage
        .bucket(this.bucketName)
        .file(storagePath)
        .download();
      return buffer;
    }

    const localPath = join(this.localRoot, storagePath);
    if (!existsSync(localPath)) {
      throw new InternalServerErrorException(
        `Stored file not found: ${storagePath}`,
      );
    }

    return readFileSync(localPath);
  }

  async fileExists(storagePath: string) {
    if (this.backend === 'gcs') {
      if (!this.storage || !this.bucketName) {
        return false;
      }

      const [exists] = await this.storage
        .bucket(this.bucketName)
        .file(storagePath)
        .exists();
      return exists;
    }

    return existsSync(join(this.localRoot, storagePath));
  }
}
