import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import fontkit from 'fontkit';
import { join } from 'path';
import { PDFDocument, rgb } from 'pdf-lib';

import type {
  AppealDecision,
  AppealRequest,
  CommitteeNotice,
  FormCode,
  FormSnapshot,
  InventionSubmission,
} from '../domain/models';
import { createId, now } from '../domain/utils';
import { FileStorageService } from './file-storage.service';

type FormTemplateInput =
  | {
      formCode: 'FORM1' | 'FORM2' | 'FORM3_1' | 'FORM3_2' | 'FORM4';
      submission: InventionSubmission;
    }
  | {
      formCode: 'FORM5' | 'FORM6';
      notice: CommitteeNotice;
      submission: InventionSubmission;
    }
  | {
      formCode: 'FORM7';
      appealRequest: AppealRequest;
    }
  | {
      formCode: 'FORM8';
      appealDecision: AppealDecision;
      appealRequest: AppealRequest;
    }
  | {
      formCode: 'FORM9';
      notice: {
        documentNo: string;
        inventionTitle: string;
        inventorNames: string[];
        rightContent?: string;
        isFiled: boolean;
        applicationDate?: string;
        applicationNo?: string;
        notFiledReason?: string;
      };
    };

@Injectable()
export class DocumentService {
  private readonly apiRoot = this.resolveApiRoot();
  private readonly primaryTemplatePath = join(
    this.apiRoot,
    'assets',
    'templates',
    'AKS-A024.pdf',
  );
  private readonly fontCandidates = [
    process.env.PDF_FONT_PATH,
    join(this.apiRoot, 'assets', 'fonts', 'NotoSansKR-Regular.ttf'),
    'C:\\Windows\\Fonts\\malgun.ttf',
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
  ].filter(Boolean) as string[];

  constructor(private readonly storage: FileStorageService) {}

  private resolveApiRoot() {
    const cwd = process.cwd();
    if (existsSync(join(cwd, 'src')) && existsSync(join(cwd, 'assets'))) {
      return cwd;
    }

    return join(cwd, 'apps', 'api');
  }

  async createFormSnapshot(input: {
    formCode: FormCode;
    targetType: FormSnapshot['targetType'];
    targetId: string;
    title: string;
    generatedBy: string;
    sections: { heading: string; lines: string[] }[];
  }): Promise<FormSnapshot> {
    const generatedAt = now();
    const fileName = `${input.formCode}-${input.targetId}-${generatedAt.slice(0, 10)}.pdf`;
    const tempPath = this.storage.createTempPath(fileName);

    await this.renderSimplePdf({
      title: input.title,
      formCode: input.formCode,
      filePath: tempPath,
      sections: input.sections,
    });

    const filePath = await this.storage.persistGeneratedFile(
      tempPath,
      fileName,
    );

    return {
      id: createId(),
      formCode: input.formCode,
      targetType: input.targetType,
      targetId: input.targetId,
      title: input.title,
      generatedBy: input.generatedBy,
      generatedAt,
      fileName,
      filePath,
      previewLines: input.sections.flatMap((section) => [
        section.heading,
        ...section.lines.slice(0, 3),
      ]),
    };
  }

  async createRegulationFormSnapshot(input: {
    targetType: FormSnapshot['targetType'];
    targetId: string;
    title: string;
    generatedBy: string;
    payload: FormTemplateInput;
  }): Promise<FormSnapshot> {
    const generatedAt = now();
    const fileName = `${input.payload.formCode}-${input.targetId}-${generatedAt.slice(0, 10)}.pdf`;
    const tempPath = this.storage.createTempPath(fileName);

    await this.renderTemplatePdf(
      input.payload,
      tempPath,
      this.resolveTemplatePath(),
    );
    const filePath = await this.storage.persistGeneratedFile(
      tempPath,
      fileName,
    );

    return {
      id: createId(),
      formCode: input.payload.formCode,
      targetType: input.targetType,
      targetId: input.targetId,
      title: input.title,
      generatedBy: input.generatedBy,
      generatedAt,
      fileName,
      filePath,
      previewLines: this.buildPreviewLines(input.payload),
    };
  }

  private buildPreviewLines(input: FormTemplateInput): string[] {
    switch (input.formCode) {
      case 'FORM1':
      case 'FORM2':
      case 'FORM3_1':
      case 'FORM3_2':
      case 'FORM4':
        return [
          input.submission.submissionNo,
          input.submission.formData.form1.inventionTitleKo,
          input.submission.shares.map((share) => share.inventorName).join(', '),
        ];
      case 'FORM5':
      case 'FORM6':
        return [
          input.notice.documentNo,
          input.submission.title,
          input.notice.decisionItems.successionDecision ?? '-',
        ];
      case 'FORM7':
        return [
          input.appealRequest.receivedNo,
          input.appealRequest.inventionTitle,
          input.appealRequest.purpose,
        ];
      case 'FORM8':
        return [
          input.appealDecision.documentNo,
          input.appealRequest.inventionTitle,
          input.appealDecision.decisionSummary,
        ];
      case 'FORM9':
        return [
          input.notice.documentNo,
          input.notice.inventionTitle,
          input.notice.applicationNo ?? '미출원',
        ];
      default:
        return ['문서'];
    }
  }

  private async renderSimplePdf(input: {
    title: string;
    formCode: FormCode;
    filePath: string;
    sections: { heading: string; lines: string[] }[];
  }) {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit as never);
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(readFileSync(this.resolveFontPath()));

    let cursorY = 800;
    page.drawText(`AKS-A024 ${input.formCode}`, {
      x: 430,
      y: cursorY,
      size: 11,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    cursorY -= 30;
    page.drawText(input.title, {
      x: 140,
      y: cursorY,
      size: 20,
      font,
      color: rgb(0.12, 0.12, 0.12),
    });
    cursorY -= 30;

    input.sections.forEach((section) => {
      page.drawRectangle({
        x: 40,
        y: cursorY - 18,
        width: 515,
        height: 22,
        color: rgb(0.85, 0.89, 0.95),
        borderColor: rgb(0.72, 0.79, 0.86),
        borderWidth: 1,
      });
      page.drawText(section.heading, {
        x: 50,
        y: cursorY - 11,
        size: 11,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      cursorY -= 40;
      section.lines.forEach((line) => {
        page.drawText(line, {
          x: 48,
          y: cursorY,
          size: 10,
          font,
          color: rgb(0.15, 0.15, 0.15),
          maxWidth: 500,
        });
        cursorY -= 16;
      });
      cursorY -= 12;
    });

    writeFileSync(input.filePath, await pdf.save());
  }

  private async renderTemplatePdf(
    input: FormTemplateInput,
    filePath: string,
    templatePath: string,
  ) {
    const templateBytes = readFileSync(templatePath);
    const templatePdf = await PDFDocument.load(templateBytes);
    const outputPdf = await PDFDocument.create();
    outputPdf.registerFontkit(fontkit as never);
    const font = await outputPdf.embedFont(
      readFileSync(this.resolveFontPath()),
    );

    const pageIndexMap: Record<FormCode, number> = {
      FORM1: 15,
      FORM2: 16,
      FORM3_1: 17,
      FORM3_2: 18,
      FORM4: 19,
      FORM5: 20,
      FORM6: 21,
      FORM7: 22,
      FORM8: 23,
      FORM9: 24,
    };

    const [page] = await outputPdf.copyPages(templatePdf, [
      pageIndexMap[input.formCode],
    ]);
    outputPdf.addPage(page);
    const outputPage = outputPdf.getPage(0);

    const draw = (text: string, x: number, y: number, size = 9) => {
      outputPage.drawText(text || '-', {
        x,
        y,
        size,
        font,
        color: rgb(0.12, 0.12, 0.12),
      });
    };

    const drawWrapped = (
      text: string,
      x: number,
      y: number,
      width: number,
      lineHeight = 12,
      size = 9,
    ) => {
      const source = text || '-';
      const chunks: string[] = [];
      let current = '';

      for (const char of source) {
        const next = current + char;
        const measured = font.widthOfTextAtSize(next, size);
        if (measured > width && current.length > 0) {
          chunks.push(current);
          current = char;
        } else {
          current = next;
        }
      }

      if (current) {
        chunks.push(current);
      }

      chunks.forEach((line, index) => {
        outputPage.drawText(line, {
          x,
          y: y - index * lineHeight,
          size,
          font,
          color: rgb(0.12, 0.12, 0.12),
        });
      });
    };

    switch (input.formCode) {
      case 'FORM1': {
        const { submission } = input;
        const { form1 } = submission.formData;
        draw(submission.submissionNo, 388, 675, 8);
        draw(form1.inventionTitleKo, 182, 596, 9);
        draw(form1.inventionTitleEn ?? '-', 182, 577, 8);
        submission.shares.slice(0, 4).forEach((share, index) => {
          const baseY = 547 - index * 39;
          draw(share.inventorName, 184, baseY, 8);
          draw(share.inventorNameEn ?? '-', 184, baseY - 16, 8);
          draw(String(share.shareRatio), 312, baseY, 8);
          draw(share.department ?? '-', 358, baseY, 8);
          draw(share.phoneNumber ?? '-', 461, baseY, 8);
        });
        draw(form1.relatedProjectName ?? '-', 228, 405, 8);
        draw(form1.fundingAgency ?? '-', 365, 405, 8);
        draw(form1.researchPeriod ?? '-', 470, 405, 8);
        draw(form1.desiredCountries.join(', ') || '-', 182, 386, 8);
        draw(form1.disclosureType.join(', ') || '-', 291, 349, 8);
        draw(
          form1.inventionCategory === 'JOB_INVENTION' ? '직무발명' : '개인발명',
          352,
          330,
          8,
        );
        draw(form1.inventionStage, 269, 311, 8);
        draw(form1.additionalResearchNeeded ? 'YES' : 'NO', 345, 274, 8);
        drawWrapped(
          form1.interestedCompanies.join(', ') || '-',
          407,
          237,
          110,
          10,
          8,
        );
        draw(form1.researchNoteManaged ? 'YES' : 'NO', 343, 218, 8);
        drawWrapped(form1.relatedPatentKeywords ?? '-', 227, 181, 290, 9, 8);
        break;
      }
      case 'FORM2': {
        const { submission } = input;
        draw(submission.title, 148, 590, 8);
        draw(submission.submissionNo, 148, 572, 8);
        submission.formData.form2.assignmentShares
          .slice(0, 5)
          .forEach((share, index) => {
            const baseY = 535 - index * 72;
            draw(share.inventorName, 150, baseY, 8);
            draw(share.residentRegistrationNumber ?? '-', 265, baseY, 8);
            drawWrapped(share.address ?? '-', 149, baseY - 22, 270, 10, 8);
            draw(String(share.shareRatio), 462, baseY, 8);
          });
        draw(submission.formData.form2.assigneeCompany, 182, 173, 8);
        draw(submission.formData.form2.assigneeTitle, 300, 173, 8);
        break;
      }
      case 'FORM3_1': {
        const { form3, form1 } = input.submission.formData;
        draw(form1.inventionTitleKo, 165, 620, 8);
        draw(form1.inventionTitleEn ?? '-', 260, 620, 8);
        drawWrapped(form3.drawingDescription ?? '-', 165, 585, 360, 10, 8);
        drawWrapped(form3.technicalField ?? '-', 190, 505, 325, 10, 8);
        drawWrapped(form3.background ?? '-', 190, 425, 325, 10, 8);
        drawWrapped(form3.technicalProblem ?? '-', 190, 345, 325, 10, 8);
        break;
      }
      case 'FORM3_2': {
        const { form3 } = input.submission.formData;
        drawWrapped(form3.solvingMeans ?? '-', 200, 585, 315, 10, 8);
        drawWrapped(form3.functionAndEffect ?? '-', 200, 525, 315, 10, 8);
        drawWrapped(form3.examples ?? '-', 200, 463, 315, 10, 8);
        drawWrapped(form3.inventionEffect ?? '-', 165, 371, 350, 10, 8);
        drawWrapped(form3.claims[0] ?? '-', 165, 277, 350, 10, 8);
        drawWrapped(form3.claims[1] ?? '-', 165, 237, 350, 10, 8);
        drawWrapped(form3.claims[2] ?? '-', 165, 196, 350, 10, 8);
        break;
      }
      case 'FORM4': {
        const { form1, form4 } = input.submission.formData;
        draw(input.submission.submitterUserId, 110, 624, 8);
        draw(input.submission.submissionNo, 392, 624, 8);
        draw(form1.inventionTitleKo, 110, 606, 8);
        draw(input.submission.submittedAt?.slice(0, 10) ?? '-', 392, 606, 8);
        form4.priorPatentRows.slice(0, 3).forEach((row, index) => {
          const baseY = 519 - index * 52;
          drawWrapped(row.existingPatent ?? '-', 92, baseY, 120, 9, 7);
          drawWrapped(row.noveltyDiff ?? '-', 218, baseY, 110, 9, 7);
          drawWrapped(row.inventiveDiff ?? '-', 336, baseY, 165, 9, 7);
        });
        form4.referenceRows.slice(0, 2).forEach((row, index) => {
          const baseY = 284 - index * 98;
          drawWrapped(row.reference ?? '-', 92, baseY, 120, 9, 7);
          drawWrapped(row.summary ?? '-', 218, baseY, 110, 9, 7);
          drawWrapped(row.distinguishingFeature ?? '-', 336, baseY, 165, 9, 7);
        });
        break;
      }
      case 'FORM5':
      case 'FORM6': {
        const { notice, submission } = input;
        draw(notice.noticeDate.slice(0, 10), 387, 676, 8);
        draw(submission.submitterUserId, 171, 568, 8);
        draw(notice.documentNo, 171, 587, 8);
        draw(submission.title, 171, 550, 8);
        draw(notice.decisionItems.jobInventionDecision ?? '-', 176, 443, 8);
        draw(notice.decisionItems.successionDecision ?? '-', 176, 408, 8);
        draw(notice.decisionItems.patentGrade ?? '-', 176, 373, 8);
        draw(notice.decisionItems.domesticOverseasPlan ?? '-', 176, 337, 8);
        draw(notice.decisionItems.examinationRequestPlan ?? '-', 176, 302, 8);
        drawWrapped(notice.decisionItems.remarks ?? '-', 176, 266, 320, 10, 8);
        break;
      }
      case 'FORM7': {
        const { appealRequest } = input;
        draw(appealRequest.applicantName, 132, 588, 8);
        draw(
          appealRequest.applicantResidentRegistrationNumber ?? '-',
          250,
          588,
          8,
        );
        draw(appealRequest.applicantDepartment ?? '-', 132, 568, 8);
        drawWrapped(
          appealRequest.applicantAddress ?? '-',
          132,
          548,
          360,
          10,
          8,
        );
        draw(appealRequest.receivedAt.slice(0, 10), 132, 512, 8);
        draw(appealRequest.receivedNo, 255, 512, 8);
        draw(appealRequest.inventionTitle, 132, 476, 8);
        draw(appealRequest.reasonOccurredAt ?? '-', 132, 439, 8);
        draw(appealRequest.committeeNoticeDate ?? '-', 132, 402, 8);
        drawWrapped(appealRequest.purpose, 84, 326, 430, 11, 8);
        drawWrapped(appealRequest.reason, 84, 190, 430, 11, 8);
        break;
      }
      case 'FORM8': {
        const { appealDecision, appealRequest } = input;
        draw(appealDecision.documentNo, 114, 586, 8);
        draw(appealRequest.applicantName, 114, 566, 8);
        draw(appealRequest.inventionTitle, 114, 546, 8);
        drawWrapped(appealDecision.requestSummary, 84, 396, 430, 11, 8);
        drawWrapped(appealDecision.decisionSummary, 84, 258, 430, 11, 8);
        break;
      }
      case 'FORM9': {
        const { notice } = input;
        draw(notice.documentNo, 114, 589, 8);
        draw(notice.inventorNames.join(', '), 114, 570, 8);
        draw(notice.inventionTitle, 114, 550, 8);
        draw(notice.inventorNames.join(', '), 114, 531, 8);
        draw(notice.rightContent ?? '-', 115, 440, 8);
        draw(notice.isFiled ? '출원' : '미출원', 115, 402, 8);
        draw(notice.applicationDate ?? '-', 115, 365, 8);
        draw(notice.applicationNo ?? '-', 301, 365, 8);
        drawWrapped(notice.notFiledReason ?? '-', 115, 284, 400, 11, 8);
        break;
      }
    }

    writeFileSync(filePath, await outputPdf.save());
  }

  private resolveTemplatePath() {
    if (!existsSync(this.primaryTemplatePath)) {
      throw new InternalServerErrorException(
        'Regulation PDF template was not found.',
      );
    }
    return this.primaryTemplatePath;
  }

  private resolveFontPath() {
    const matched = this.fontCandidates.find((candidate) =>
      existsSync(candidate),
    );
    if (!matched) {
      throw new InternalServerErrorException(
        `No PDF font file was found. Checked: ${this.fontCandidates.join(', ')}`,
      );
    }
    return matched;
  }
}
