# Mooodle Lite

A lightweight Moodle-inspired learning platform built with Angular (frontend) and Express (backend).  
_Not affiliated with Moodle._

---

## ⚠️ College Project Notice

This was created for learning purposes during UTBM’s 2025 courses.  
**Not production‑ready**—use at your own risk; security gaps might exist.

**Courses involved**  
- WE4B: Web Frontend Development  
- SI40: Databases & Information Systems  
- HM40: Human‑Machine Interaction  

---

## 👥 Team

- **Rémi BERNARD** – [GitHub](https://github.com/remib18)  
- **Gaëlle LE BOULICAUT** – [GitHub](https://github.com/gaelleleboulicaut)  
- **Nicolas MALEWICZ** – [GitHub](https://github.com/Nykoula)  
- **Mathys KERJEAN** – [GitHub](https://github.com/Mathmout)  
- **Fabien THUNEVIN** – [GitHub](https://github.com/Jipmaa)  
- **Baptiste PIERSON** – [GitHub](https://github.com/OMGPOGGERZ)  

---

## 🚀 Quick Start

### Prerequisites

- **Node.js ≥ 20.0** (includes npm)  
- **Docker & Docker Compose**  
- **Git** (for cloning)

Verify with:
```bash
node --version
npm --version
docker --version
git --version
````

### 1. Clone

```bash
git clone https://github.com/Jipmaa/WE4B.git
cd WE4B
```

### 2. Setup Environment

```bash
cd server
cp .env.example .env
```

> Only tweak `.env` if you swap out the provided Docker services.

---

## 🛠️ Development

### JetBrains IDEs

1. Open the project in your IDE.
2. Run the `Start all` configuration, which will:

    * Bring up MongoDB & MinIO via Docker Compose
    * Launch the Express server in dev mode
    * Launch the Angular app

### Other IDEs / CLI

#### Install Dependencies

```bash
# Frontend
cd client
npm install
cd ..

# Backend
cd server
npm install
cd ..
```

#### Start Backend

```bash
cd server
docker compose up -d
npm run dev
```

#### Start Frontend

In a new terminal:

```bash
cd client
npm start
```

---

Now you should have the API on **[http://localhost:3000](http://localhost:3000)** and the Angular UI on **[http://localhost:4200](http://localhost:4200)**. Enjoy hacking! 🚀