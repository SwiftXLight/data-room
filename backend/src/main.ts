import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  
  // Set global prefix to /api
  app.setGlobalPrefix('api');

  // Configure CORS
  const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // Register validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Register the custom HTTP exception filter globally
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`Backend server successfully started on: http://localhost:${port}/api`);
}
bootstrap();
