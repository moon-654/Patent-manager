import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { bootstrapPolicy } from './bootstrap-data';
import { PrismaService } from './prisma.service';

@Injectable()
export class DatabaseBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const existingPolicies = await this.prisma.policyVersion.count();
      if (existingPolicies > 0) {
        return;
      }

      await this.prisma.policyVersion.create({
        data: {
          versionCode: bootstrapPolicy.versionCode,
          name: bootstrapPolicy.name,
          status: bootstrapPolicy.status,
          effectiveDate: bootstrapPolicy.effectiveDate,
          noticeDate: bootstrapPolicy.noticeDate,
          createdBy: bootstrapPolicy.createdBy,
          approvedBy: bootstrapPolicy.approvedBy,
          isDisadvantageous: bootstrapPolicy.isDisadvantageous,
          changeSummary: bootstrapPolicy.changeSummary,
          grades: {
            create: bootstrapPolicy.grades.map((grade) => ({
              gradeCode: grade.gradeCode,
              gradeName: grade.gradeName,
              minScore: grade.minScore,
              maxScore: grade.maxScore,
              displayOrder: grade.displayOrder,
            })),
          },
          evaluationCriteria: {
            create: bootstrapPolicy.criteria.map((criterion) => ({
              criterionCode: criterion.criterionCode,
              criterionName: criterion.criterionName,
              maxScore: criterion.maxScore,
              displayOrder: criterion.displayOrder,
              levels: {
                create: criterion.levels.map((level) => ({
                  levelCode: level.levelCode,
                  levelName: level.levelName,
                  mappedScore: level.mappedScore,
                  displayOrder: level.displayOrder,
                })),
              },
            })),
          },
        },
      });
    } catch (error) {
      this.logger.warn(
        `Database bootstrap skipped: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
