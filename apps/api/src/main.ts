import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';

import { AppModule } from './app.module';

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
  );
  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 22020);
  const webPort = Number(process.env.WEB_PORT ?? 22021);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: [`http://localhost:${webPort}`],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Patent Manager API')
    .setDescription('MVP API for the patent manager workspace')
    .setVersion('0.1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
}

void bootstrap();
