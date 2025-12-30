# Infrastructure

This directory contains the infrastructure setup for the Solana SVM Study project, including Kubernetes manifests, monitoring configuration, and deployment scripts.

## Directory Structure

```
infra/
├── k8s/                        # Kubernetes manifests
│   ├── namespace.yaml          # Namespace definition
│   ├── configmap.yaml          # Application configuration
│   ├── secret.yaml             # Secrets (base64 encoded)
│   ├── pvc.yaml               # Persistent volume claims
│   ├── postgres.yaml          # PostgreSQL deployment and service
│   ├── zookeeper.yaml         # Zookeeper deployment and service
│   ├── kafka.yaml             # Kafka deployment and service
│   ├── redis.yaml             # Redis deployment and service
│   ├── solana-validator.yaml  # Solana test validator
│   └── app.yaml               # Application deployment and service
└── monitoring/                # Monitoring stack
    ├── prometheus.yaml        # Prometheus deployment
    └── grafana.yaml           # Grafana deployment
```

## Prerequisites

- Kubernetes cluster (local with minikube/kind or cloud provider)
- kubectl configured
- Docker registry access (if using private images)

## Deployment

1. Create namespace:
```bash
kubectl apply -f k8s/namespace.yaml
```

2. Deploy storage:
```bash
kubectl apply -f k8s/pvc.yaml
```

3. Deploy databases and message queue:
```bash
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/zookeeper.yaml
kubectl apply -f k8s/kafka.yaml
kubectl apply -f k8s/redis.yaml
```

4. Deploy Solana validator:
```bash
kubectl apply -f k8s/solana-validator.yaml
```

5. Deploy application:
```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/app.yaml
```

5. Deploy monitoring:
```bash
kubectl apply -f monitoring/prometheus.yaml
kubectl apply -f monitoring/grafana.yaml
```

## Services

- **PostgreSQL**: `postgres-service:5432`
- **Kafka**: `kafka-service:9092`
- **Redis**: `redis-service:6379`
- **Solana Validator**: `solana-validator-service:8899` (RPC), `:8900` (WebSocket), `:9900` (Faucet)
- **Application**: `solana-study-app-service:3000`
- **Prometheus**: `prometheus-service:9090`
- **Grafana**: `grafana-service:3000` (admin/admin)

## Health Checks

The application includes comprehensive health checks at `/health` endpoint, monitoring:
- Database connectivity
- Kafka connectivity
- Redis connectivity

## Scaling

To scale the application:
```bash
kubectl scale deployment solana-study-app --replicas=3 -n solana-study
```

## Monitoring

Access Grafana at the service endpoint and configure Prometheus as data source.

## Security Notes

- Secrets are base64 encoded (not encrypted)
- Use Kubernetes secrets management or external providers in production
- Implement network policies for service isolation
- Configure RBAC for access control