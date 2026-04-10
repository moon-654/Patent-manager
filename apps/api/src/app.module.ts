import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PoliciesModule } from './policies/policies.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { MeetingMinutesModule } from './meeting-minutes/meeting-minutes.module';
import { PatentsModule } from './patents/patents.module';
import { RewardsModule } from './rewards/rewards.module';
import { MyModule } from './my/my.module';
import { SystemModule } from './system/system.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    AuthModule,
    UsersModule,
    PoliciesModule,
    SubmissionsModule,
    EvaluationsModule,
    MeetingMinutesModule,
    PatentsModule,
    RewardsModule,
    MyModule,
    SystemModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
