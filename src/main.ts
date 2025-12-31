import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // enable global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // enable cors
  app.enableCors();

  // setup swagger
  const config = new DocumentBuilder()
    .setTitle("Solana SVM Study API")
    .setDescription(
      "API for managing Solana and SVM integrations with secure authentication",
    )
    .setVersion("1.0")
    .addTag("solana")
    .addTag("svm")
    .addTag("blockchain")
    .addTag("Authentication")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "JWT-auth",
    )
    .addApiKey(
      {
        type: "apiKey",
        name: "X-API-Key",
        in: "header",
        description: "Enter API key",
      },
      "api-key",
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  await app.listen(3000);
  const logger = new Logger("bootstrap");
  logger.log("application is running on: http://localhost:3000");
  logger.log("api documentation: http://localhost:3000/api");
}
bootstrap();
