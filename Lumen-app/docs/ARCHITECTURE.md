# LUMEN Architecture & Design Guide

This document outlines the architecture, directory structure, and engineering conventions used in the LUMEN mobile application.

---

## 1. Architectural Overview

LUMEN is designed using **Clean Architecture** and **Domain-Driven Design (DDD)** principles to ensure separation of concerns, strict modularity, and high testability.

```mermaid
graph TD
    subgraph Presentation Layer
        Screens[Screens / Expo Router] --> Components[React Native UI Components]
    end

    subgraph Application Layer
        Hooks[Custom React Hooks] --> Services[Use Cases / API Contracts]
    end

    subgraph Domain Layer
        Entities[Domain Entities / Types] --> Validation[Validation Rules]
    end

    subgraph Infrastructure Layer
        APIClient[REST Client / WebSockets] --> Storage[Secure Local Storage]
    end

    Presentation Layer --> Application Layer
    Application Layer --> Domain Layer
    Infrastructure Layer --> Application Layer
```

---

## 2. Directory Structure

The project has a distinct split between routing (`app/`) and business logic (`src/`):

- **`app/`**: Contains the Expo Router file-based routing definition.
  - `_layout.tsx`: Root stack layout.
  - `+not-found.tsx`: Graceful 404 handler.
  - `(auth)/`: Login, Otp, Register stack.
  - `(citizen)/`: Citizen dashboards, settings, and reports.
  - `(engineer)/`: Task listings, progress logs, proof uploads.
  - `(shared)/`: Camera, image preview, map screens.
- **`src/`**: Shared core code.
  - `components/`: Reusable, atomic component packages.
  - `config/`: Static application settings, routing endpoints, and environment variables.
  - `constants/`: Design tokens, colors, layout margins.
  - `hooks/`: Application-wide state handlers (connectivity, auth state, local cache).
  - `services/`: Core subsystems (storage services, network wrappers, push notifications).
  - `store/`: Application state management stores (Zustand/Context equivalent).
  - `theme/`: Base styling rules, colors, animations, and typography tokens.
  - `types/`: Centralized type contracts.
  - `features/`: Modular domain features. Each feature contains its own clean-architecture slice (e.g. `domain/`, `application/`, `presentation/`).

---

## 3. Core Subsystems

### Environment Configuration

The configuration in `src/config/env.ts` handles dynamic environment configuration using Expo's native `EXPO_PUBLIC_` convention. This prevents hardcoding secrets or API links in code, supporting local `.env` and Docker container overrides.

### Offline-First Architecture

LUMEN implements an offline-ready workflow:

1.  **Connectivity Hook (`useConnectivity`)**: Uses network status events on web and background ping validation on native targets to check online states.
2.  **Offline Queue Hook (`useOfflineQueue`)**: Provides queuing mechanisms for caching operations while disconnected, syncing them once online is restored.
3.  **Local Storage (`StorageService`)**: Local storage wrapper managing cached reports and tokens.

### Enterprise API Client

The `ApiClient` wrapper in `src/services/api/client/index.ts` is configured with:

- Global Authorization header injection.
- Request & response interceptors.
- Graceful API error parsing.
