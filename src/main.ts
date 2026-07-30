import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Prisma uses bigint for file sizes and aggregate watch time; expose those values
// as JSON numbers for the frontend instead of letting JSON.stringify fail.
(BigInt.prototype as unknown as { toJSON?: () => number }).toJSON =
  function () {
    return Number(this);
  };

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors();
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Coaching Platform API')
    .setDescription(
      'Multi-tenant teaching platform API. Endpoints are grouped by actor and workflow; every protected endpoint requires a bearer access token.',
    )
    .setVersion('1.0')
    .addServer('http://localhost:3000', 'Local development')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
