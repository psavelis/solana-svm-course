import { Injectable, OnModuleInit } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

@Injectable()
export class TracingService implements OnModuleInit {
  private sdk: NodeSDK;

  onModuleInit() {
    // Configure Jaeger exporter
    const jaegerExporter = new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    });

    // Initialize OpenTelemetry SDK with auto-instrumentations
    this.sdk = new NodeSDK({
      serviceName: 'solana-svm-study',
      traceExporter: jaegerExporter,
      instrumentations: [getNodeAutoInstrumentations()],
    });

    // Start the SDK
    this.sdk.start();

    console.log('OpenTelemetry tracing initialized with Jaeger exporter');
  }

  onModuleDestroy() {
    // Gracefully shut down the SDK
    this.sdk?.shutdown();
  }
}