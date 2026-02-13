# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Browser                       │
│                     (React/Next.js App)                      │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
                │ HTTP/HTTPS             │ WebSocket
                │                         │
┌───────────────▼─────────────────────────▼───────────────────┐
│                      Nginx (Port 80/443)                     │
│                    (Reverse Proxy & Load Balancer)           │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
        ┌───────▼────────┐        ┌──────▼─────────┐
        │   Frontend     │        │    Backend     │
        │   Next.js      │        │    FastAPI     │
        │  (Port 3000)   │        │  (Port 8000)   │
        └────────────────┘        └────┬───────────┘
                                       │
                        ┌──────────────┼──────────────┐
                        │              │              │
                ┌───────▼─────┐ ┌─────▼──────┐ ┌────▼─────┐
                │ PostgreSQL  │ │   Redis    │ │WebSocket │
                │  (Port 5432)│ │(Port 6379) │ │ Manager  │
                └─────────────┘ └────────────┘ └──────────┘
```

## Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages/App  │  │  Components  │  │    Stores    │      │
│  │   Routing    │  │      UI      │  │   (Zustand)  │      │
│  └──────┬───────┘  └──────────────┘  └──────────────┘      │
│         │                                                     │
│  ┌──────▼─────────────────────────────────────────┐         │
│  │              API Client Layer                  │         │
│  │         (Axios + SWR + WebSocket)              │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────┐           │
│  │              API Router (v1)                 │           │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────────┐   │           │
│  │  │  Auth   │ │  Users  │ │  WebSocket   │   │           │
│  │  └─────────┘ └─────────┘ └──────────────┘   │           │
│  └──────┬───────────────────────────────────────┘           │
│         │                                                     │
│  ┌──────▼─────────────────────────────────────┐             │
│  │          Business Logic Layer              │             │
│  │        (Services & Dependencies)           │             │
│  └──────┬─────────────────────────────────────┘             │
│         │                                                     │
│  ┌──────▼─────────────────────────────────────┐             │
│  │         Data Access Layer (ORM)            │             │
│  │          (SQLAlchemy Async)                │             │
│  └────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   PostgreSQL     │         │      Redis       │          │
│  │  - Users         │         │  - Sessions      │          │
│  │  - WishLists     │         │  - Cache         │          │
│  │  - Items         │         │  - Real-time     │          │
│  └──────────────────┘         └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### HTTP Request Flow
```
User Action → Frontend Component → API Client
                                        ↓
                                  HTTP Request
                                        ↓
                                   Nginx Proxy
                                        ↓
                              FastAPI Router
                                        ↓
                             Validation (Pydantic)
                                        ↓
                              Business Logic
                                        ↓
                            Database Query (SQLAlchemy)
                                        ↓
                                  PostgreSQL
                                        ↓
                              Response (Pydantic)
                                        ↓
                                Frontend Update
```

### WebSocket Flow
```
Client Connect → WebSocket Client → Nginx Proxy
                                          ↓
                              FastAPI WebSocket Handler
                                          ↓
                              Connection Manager
                                          ↓
                    ┌─────────────────────┼─────────────────────┐
                    ↓                     ↓                     ↓
            Personal Message      Broadcast Message      Disconnect
                    ↓                     ↓                     ↓
              Single Client         All Clients           Cleanup
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Security Layers                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Network Layer                                            │
│     └─ Nginx: Rate Limiting, SSL/TLS, CORS                  │
│                                                               │
│  2. Application Layer                                        │
│     └─ FastAPI: JWT Authentication, Input Validation        │
│                                                               │
│  3. Data Layer                                               │
│     └─ PostgreSQL: Hashed Passwords, Row-level Security     │
│                                                               │
│  4. Infrastructure Layer                                     │
│     └─ Docker: Container Isolation, Network Segmentation    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Development
```
┌──────────────────────────────────────┐
│         Developer Machine            │
│  ┌────────────────────────────────┐  │
│  │     Docker Compose (dev)       │  │
│  │  ┌──────┐ ┌──────┐ ┌────────┐ │  │
│  │  │ FE   │ │ BE   │ │   DB   │ │  │
│  │  │ :3000│ │ :8000│ │ :5432  │ │  │
│  │  └──────┘ └──────┘ └────────┘ │  │
│  │          Hot Reload             │  │
│  │       Volume Mounts             │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Production
```
┌────────────────────────────────────────────────────────────┐
│                      Cloud Provider                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Load Balancer                        │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
│  ┌────────────────▼────────────────────────────┐           │
│  │              Nginx Container                │           │
│  │         (SSL Termination, Proxy)            │           │
│  └──────┬──────────────────────────────────────┘           │
│         │                                                   │
│  ┌──────▼──────────┐      ┌────────────────────┐           │
│  │   Frontend      │      │     Backend        │           │
│  │  (Multiple)     │      │   (Multiple)       │           │
│  │   Replicas      │      │    Replicas        │           │
│  └─────────────────┘      └──────┬─────────────┘           │
│                                   │                         │
│                    ┌──────────────┼──────────────┐          │
│                    │              │              │          │
│             ┌──────▼─────┐  ┌────▼─────┐  ┌─────▼─────┐   │
│             │ PostgreSQL │  │  Redis   │  │  Backup   │   │
│             │  (Primary) │  │ Cluster  │  │  Storage  │   │
│             │+ Replicas  │  └──────────┘  └───────────┘   │
│             └────────────┘                                 │
└────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Stack
```
Next.js 14
  ├── React 18
  ├── TypeScript
  ├── Tailwind CSS
  ├── Zustand (State Management)
  ├── SWR (Data Fetching)
  ├── Axios (HTTP Client)
  └── WebSocket API
```

### Backend Stack
```
FastAPI
  ├── Python 3.11
  ├── Pydantic (Validation)
  ├── SQLAlchemy (ORM)
  ├── Asyncpg (PostgreSQL Driver)
  ├── Alembic (Migrations)
  ├── Python-Jose (JWT)
  └── Passlib (Password Hashing)
```

### Infrastructure Stack
```
Docker & Docker Compose
  ├── PostgreSQL 16
  ├── Redis 7
  ├── Nginx (Alpine)
  └── Multi-stage Builds
```

## Scalability Considerations

### Horizontal Scaling
- Frontend: Multiple Next.js instances behind load balancer
- Backend: Multiple FastAPI workers with shared Redis
- Database: PostgreSQL replication (read replicas)

### Caching Strategy
- Redis for session storage
- React Query/SWR for client-side caching
- Nginx caching for static assets
- Database query result caching

### Performance Optimization
- Database connection pooling
- Async I/O throughout the stack
- CDN for static assets
- Image optimization (Next.js Image)
- Code splitting and lazy loading

## Monitoring & Observability

```
Application
    ↓
Structured Logging
    ↓
 ┌──────┬──────┬──────┐
 │ Logs │Metrics│Traces│
 └──┬───┴───┬──┴──┬───┘
    ↓       ↓     ↓
[Future: ELK/Grafana/Sentry]
```

---

**Production-Ready Architecture** ✅
**Scalable & Maintainable** ✅
**Security First** ✅
