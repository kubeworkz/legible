---
sidebar_position: 2
title: Kubernetes
---

# Kubernetes Deployment

Deploy Legible on Kubernetes using Kustomize.

## Prerequisites

- Kubernetes cluster (1.24+)
- `kubectl` configured
- Kustomize (built into `kubectl` 1.14+)
- Ingress controller (nginx-ingress recommended)
- cert-manager (for TLS, optional)

## Structure

The Kubernetes manifests are in `deployment/kustomizations/`:

```
kustomizations/
├── kustomization.yaml
├── base/                          # Base resource definitions
├── patches/                       # Environment-specific patches
├── examples/                      # Example configurations
├── helm-values_postgresql_15.yaml # PostgreSQL Helm values
└── helm-values-qdrant_1.11.0.yaml # Qdrant Helm values
```

## Deploy

### 1. Configure

Copy and edit the example patches for your environment:

```bash
cd deployment/kustomizations
```

Review and customize:
- `base/` — Deployment specs, services, config maps
- `patches/` — Environment overrides (secrets, resource limits)
- `examples/` — Ingress examples

### 2. Apply

```bash
kubectl apply -k deployment/kustomizations/
```

This creates:
- Namespace: `wren`
- Deployments: `legible-ui`, `wren-engine`, `wren-ai-service`, `wren-ibis-server`
- Services: ClusterIP for each deployment
- PostgreSQL and Qdrant via Helm charts

### 3. Ingress

Example ingress configuration (`examples/ingress-wren_example.yaml`):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: legible-ui-ingress
  namespace: wren
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - legible.yourdomain.com
      secretName: legible-tls
  rules:
    - host: legible.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: legible-ui-svc
                port:
                  number: 3000
```

## Services

| Service | Internal Port | ClusterIP Service |
|---------|--------------|-------------------|
| Wren UI | 3000 | `legible-ui-svc:3000` |
| Wren Engine | 8080, 7432 | `wren-engine-svc:8080` |
| AI Service | 5555 | `wren-ai-service-svc:5555` |
| Ibis Server | 8000 | `wren-ibis-server-svc:8000` |

## Database

In Kubernetes, Legible uses **PostgreSQL** instead of SQLite for the UI database. The Helm chart deploys PostgreSQL 15.

## Scaling

- **Wren UI**: Can run multiple replicas behind the ingress
- **AI Service**: Stateless — scale horizontally
- **Qdrant**: Supports clustering for high availability
- **Wren Engine / Ibis Server**: Typically single replica
