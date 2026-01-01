# Distributed Tracing

This module implements distributed tracing using OpenTelemetry with Jaeger as the tracing backend.

## Features

- **OpenTelemetry Integration**: Automatic instrumentation of Node.js applications
- **Jaeger Exporter**: Traces are exported to Jaeger for visualization and analysis
- **HTTP Request Tracing**: All incoming HTTP requests are automatically traced
- **Error Tracking**: Exceptions and errors are recorded in traces
- **Kubernetes Deployment**: Jaeger is deployed as part of the monitoring stack

## Components

### TracingService
- Initializes the OpenTelemetry SDK
- Configures Jaeger exporter
- Enables auto-instrumentation for common libraries

### TracingInterceptor
- Creates spans for each HTTP request
- Records request metadata (method, URL, user agent)
- Tracks request duration and status
- Records exceptions on errors

### Jaeger Deployment
- All-in-one Jaeger instance with collector, query, and UI
- Supports OTLP, Jaeger, and Zipkin protocols
- Web UI available at `http://jaeger.local`

## Configuration

### Environment Variables
- `JAEGER_ENDPOINT`: Jaeger collector endpoint (default: `http://localhost:14268/api/traces`)

### Kubernetes
Jaeger is deployed alongside Prometheus and Grafana in the monitoring stack:

```bash
kubectl apply -f infra/monitoring/jaeger.yaml
```

## Usage

Traces are automatically collected for all HTTP requests. View traces in the Jaeger UI:

1. Access Jaeger UI at `http://jaeger.local`
2. Search for traces by service name (`solana-svm-study`)
3. Filter by operation name or tags

## Monitoring

Jaeger health is monitored by Prometheus with the following alert:
- **JaegerDown**: Triggers when Jaeger service is unavailable

## Dependencies

- `@opentelemetry/api`
- `@opentelemetry/auto-instrumentations-node`
- `@opentelemetry/exporter-jaeger`
- `@opentelemetry/sdk-node`