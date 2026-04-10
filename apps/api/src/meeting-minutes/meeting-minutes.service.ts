import { Injectable, NotFoundException } from '@nestjs/common';

import { AccessControlService } from '../common/access-control.service';
import { AuditService } from '../common/audit.service';
import { DocumentService } from '../common/document.service';
import { PrismaService } from '../common/prisma.service';
import { addYears, now } from '../domain/utils';
import type {
  ApproveMeetingMinuteDto,
  CreateMeetingMinuteDto,
} from './meeting-minutes.dto';

@Injectable()
export class MeetingMinutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly documents: DocumentService,
  ) {}

  private assertCommittee(actorUserId: string) {
    this.accessControl.assertAnyRole(actorUserId, ['COMMITTEE', 'ADMIN']);
  }

  private async findMinute(id: string) {
    const minute = await this.prisma.meetingMinute.findUnique({
      where: { id },
    });
    if (!minute) {
      throw new NotFoundException('회의록을 찾을 수 없습니다.');
    }
    return minute;
  }

  async list() {
    const minutes = await this.prisma.meetingMinute.findMany({
      orderBy: { meetingDate: 'desc' },
    });
    return minutes.map((minute) => ({
      id: minute.id,
      title: minute.title,
      meetingDate: minute.meetingDate.toISOString(),
      status: minute.status,
      retentionUntil: minute.retentionUntil.toISOString(),
      linkedSubmissionIds: (minute.linkedSubmissionIdsJson as string[]) ?? [],
      linkedEvaluationIds: (minute.linkedEvaluationIdsJson as string[]) ?? [],
      resolution: minute.resolution,
    }));
  }

  async create(actorUserId: string, payload: CreateMeetingMinuteDto) {
    this.assertCommittee(actorUserId);
    const meetingDate = payload.meetingDate || now();
    const minute = await this.prisma.meetingMinute.create({
      data: {
        title: payload.title,
        meetingDate: new Date(meetingDate),
        retentionUntil: new Date(addYears(meetingDate, 3)),
        createdBy: actorUserId,
        attendeesJson: payload.attendees.map((item) => item.value),
        agendaJson: payload.agenda.map((item) => item.value),
        resolution: payload.resolution,
        linkedSubmissionIdsJson: payload.linkedSubmissionIds ?? [],
        linkedEvaluationIdsJson: payload.linkedEvaluationIds ?? [],
      },
    });

    this.audit.record({
      actorUserId,
      actionType: 'MEETING_MINUTE_CREATED',
      targetType: 'MEETING_MINUTE',
      targetId: minute.id,
      after: {
        title: minute.title,
        meetingDate: minute.meetingDate.toISOString(),
      },
    });

    return {
      id: minute.id,
      title: minute.title,
      meetingDate: minute.meetingDate.toISOString(),
      status: minute.status,
      retentionUntil: minute.retentionUntil.toISOString(),
      linkedSubmissionIds: (minute.linkedSubmissionIdsJson as string[]) ?? [],
      linkedEvaluationIds: (minute.linkedEvaluationIdsJson as string[]) ?? [],
      resolution: minute.resolution,
    };
  }

  async approve(
    actorUserId: string,
    id: string,
    payload?: ApproveMeetingMinuteDto,
  ) {
    this.assertCommittee(actorUserId);
    const minute = await this.findMinute(id);
    if (minute.status === 'APPROVED') {
      return {
        id: minute.id,
        title: minute.title,
        meetingDate: minute.meetingDate.toISOString(),
        status: minute.status,
        retentionUntil: minute.retentionUntil.toISOString(),
        linkedSubmissionIds: (minute.linkedSubmissionIdsJson as string[]) ?? [],
        linkedEvaluationIds: (minute.linkedEvaluationIdsJson as string[]) ?? [],
        resolution: minute.resolution,
      };
    }

    const approved = await this.prisma.meetingMinute.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: actorUserId,
        approvedAt: new Date(now()),
      },
    });

    const snapshot = await this.documents.createFormSnapshot({
      formCode: 'FORM5',
      targetType: 'MEETING_MINUTE',
      targetId: approved.id,
      title: `${approved.title} 회의록`,
      generatedBy: actorUserId,
      sections: [
        {
          heading: '회의 정보',
          lines: [
            `회의일자: ${approved.meetingDate.toISOString().slice(0, 10)}`,
            `보관만료: ${approved.retentionUntil.toISOString().slice(0, 10)}`,
          ],
        },
        {
          heading: '참석자',
          lines: ((approved.attendeesJson as string[]) ?? []).map(
            (item) => item,
          ),
        },
        {
          heading: '안건',
          lines: ((approved.agendaJson as string[]) ?? []).map((item) => item),
        },
        {
          heading: '결의',
          lines: [approved.resolution, payload?.note ?? ''],
        },
      ],
    });

    await this.prisma.formSnapshot.create({
      data: {
        id: snapshot.id,
        formCode: snapshot.formCode,
        targetType: 'MEETING_MINUTE',
        targetId: approved.id,
        title: snapshot.title,
        generatedBy: snapshot.generatedBy,
        generatedAt: new Date(snapshot.generatedAt),
        fileName: snapshot.fileName,
        filePath: snapshot.filePath,
        previewLinesJson: snapshot.previewLines,
      },
    });

    this.audit.record({
      actorUserId,
      actionType: 'MEETING_MINUTE_APPROVED',
      targetType: 'MEETING_MINUTE',
      targetId: approved.id,
      after: { approvedAt: approved.approvedAt?.toISOString() },
    });

    return {
      id: approved.id,
      title: approved.title,
      meetingDate: approved.meetingDate.toISOString(),
      status: approved.status,
      retentionUntil: approved.retentionUntil.toISOString(),
      linkedSubmissionIds: (approved.linkedSubmissionIdsJson as string[]) ?? [],
      linkedEvaluationIds: (approved.linkedEvaluationIdsJson as string[]) ?? [],
      resolution: approved.resolution,
    };
  }
}
