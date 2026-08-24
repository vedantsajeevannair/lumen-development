# LUMEN Mobile Application

LUMEN is an enterprise-grade civic management and engineering platform built on **Expo (React Native)**. It enables citizens to report local infrastructure issues and engineers to update progress and navigate assigned tasks on-site, even with poor or intermittent internet connectivity.

[![CI Status](https://github.com/lumen-org/lumen-app/workflows/CI/badge.svg)](https://github.com/lumen-org/lumen-app/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Linting](https://img.shields.io/badge/Lint-ESLint-purple.svg)](https://eslint.org/)
[![Formatting](https://img.shields.io/badge/Format-Prettier-pink.svg)](https://prettier.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-cyan.svg)](https://www.docker.com/)

---

## 🚀 Key Features

- **Offline-Ready Service Queue**: Fully cached database queuing and connectivity listeners ensure tasks are loggable without active networks and synced automatically.
- **Role-Aware Router Layout**: Separate secure flows for Citizens (`/(citizen)`) and Engineers (`/(engineer)`) with strict type-checked parameters.
- **Location & Mapping Sync**: Native spatial rendering wrappers support route mapping and task dispatching.
- **Accessibility Compliant**: Every component is built with comprehensive semantic role markings (`accessibilityRole`, `accessibilityLabel`) to ensure compatibility with screen readers.
- **Strict Engineering Quality**: Automated unit and integration testing pipelines run on each branch, accompanied by strict TypeScript checks and Prettier formatting.

---

## 📁 Repository Structure

- `app/` — Expo Router file-based route definitions (grouped by role).
- `src/components/` — Shared modular UI components.
- `src/features/` — Clean-architecture slices representing unique domains (ai, auth, camera, citizen, engineer, maps, notifications, offline, etc.).
- `src/services/` — Base platform operations (Storage, API request clients).
- `docs/` — Architectural designs and details.
- `tests/` — Automated test files.

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm (v9 or newer)

### Installation

1.  Clone the repository and install dependencies:

    ```bash
    npm install
    ```

2.  Copy the environmental variables template:

    ```bash
    cp .env.example .env
    ```

3.  Configure variables inside `.env` to match your local API servers.

### Development Scripts

| Command                 | Description                                            |
| :---------------------- | :----------------------------------------------------- |
| `npm run start`         | Start the Expo CLI development server.                 |
| `npm run android`       | Open the application on an Android Emulator.           |
| `npm run ios`           | Open the application on an iOS Simulator.              |
| `npm run web`           | Run the application inside the local browser.          |
| `npm run lint`          | Scan the project for style violations and code errors. |
| `npm run format`        | Auto-format files to adhere to Prettier conventions.   |
| `npm run test`          | Run Jest unit and integration tests.                   |
| `npm run test:coverage` | Run Jest tests and generate a code coverage report.    |

---

## 🐳 Docker Deployment (Web Target)

To compile and serve the web target inside a clean, containerized Nginx load balancer:

1.  Build and run the container:

    ```bash
    docker compose up --build -d
    ```

2.  Access the web application at `http://localhost:8080`.
