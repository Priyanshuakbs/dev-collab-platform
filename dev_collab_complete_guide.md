# 🚀 DevCollab Platform — Complete Reverse Engineering Guide

This guide contains the complete breakdown of the DevCollab Platform codebase, architecture, flows, and implementation details.

---

## 📅 PHASE 1 — PROJECT OVERVIEW

### 🎯 Project Goal
**DevCollab** is a real-time collaborative workspace designed specifically for developers. Think of it as a hybrid of **VS Code, Google Docs, Trello, and Slack**, all combined into a single, unified web application.

The goal is to allow multiple developers to:
1. Write and edit code together in real time.
2. Manage their project tasks using a Kanban board.
3. Chat with each other instantly.
4. Interact with an AI assistant to write, explain, or debug code.

---

### 🔑 Problem It Solves
When developers work in teams, they usually have to switch between many different apps:
* **Writing code:** VS Code (local editors, not easily shared live).
* **Communication:** Slack, Discord, or WhatsApp.
* **Task Tracking:** Trello, Jira, or GitHub Projects.
* **AI Assistance:** ChatGPT or Claude in separate browser tabs.

This causes **context switching** (losing focus when changing apps), sync issues, and friction when onboarding new team members.

**Analogy:** Imagine trying to cook a meal with your friends, but the stove is in the kitchen, the knives are in the garage, the ingredients are in the attic, and you have to use walkie-talkies to talk to each other. **DevCollab** brings everything—the stove, ingredients, knives, and friends—into the exact same room.

---

### 👥 Target Users
* **Student Developer Teams:** Working on group projects or hackathons.
* **Small Startup / Bootstrapped Teams:** Who need a free, fast, and simple collaborative hub.
* **Open Source Contributors:** Who want to pair-program on code directly in the browser.
* **Freelancers and Clients:** Collaborating together on design or code in real time.

---

### ✨ Main Features

| Feature | Description | Real-Time? | Key Technical Component |
| :--- | :--- | :--- | :--- |
| **Authentication** | Secure user registration, login, and profile creation. | No | JWT (JSON Web Tokens) & `bcryptjs` |
| **Project Spaces** | Create projects, view lists of projects, and invite team members. | No | MongoDB & Express REST API |
| **Collaborative Editor** | Multi-user code editor with real-time text synchronization. | **Yes** | Monaco Editor & Socket.io |
| **Kanban Task Board** | Drag-and-drop task tracking cards (To-Do, In Progress, Done). | **Yes** | `@hello-pangea/dnd` & Socket.io |
| **Workspace Chat** | Persistent group messaging sidebar within each workspace. | **Yes** | Socket.io |
| **AI Coding Assistant** | AI bot that analyzes code, finds bugs, and answers queries. | No | Google Gemini API / AI integration |
| **Real-Time Notifications** | Toast and bell alerts for invites and project activity. | **Yes** | Socket.io |
| **User Profiles** | Showcase skills, bios, and links to GitHub/LinkedIn. | No | MongoDB & Express REST API |

---

### 🛠️ Technology Stack

#### Frontend (The Client-Side)
* **React 18:** The core UI library. It builds the interactive elements on the screen.
* **Vite:** The build tool. It acts like a high-speed engine to compile, bundle, and serve our frontend files instantly during development.
* **TailwindCSS:** A utility-first CSS framework. Rather than writing long CSS files, we apply ready-made utility classes directly in the HTML/JSX.
* **Socket.io-Client:** The frontend connector for WebSockets. It keeps a continuous "phone line" open to the backend server for instantaneous updates.
* **Monaco Editor (`@monaco-editor/react`):** The browser-based text editor engine that powers VS Code.
* **Framer Motion:** An animation library used to create premium, smooth transitions and hover effects.

#### Backend (The Server-Side)
* **Node.js & Express:** The runtime environment and framework that handles incoming client requests, manages routing, and coordinates all services.
* **MongoDB & Mongoose:** A NoSQL database used to store persistent data (Users, Projects, Messages). Mongoose acts as the translator (ORM/ODM) between JavaScript code and the database.
* **Socket.io:** The WebSocket server engine that manages connected clients, matches users to specific workspaces (Rooms), and broadcasts events (like code changes or new messages).
* **JWT & bcryptjs:** Used to secure user sessions. `bcryptjs` hashes passwords before storing them in the database, and JWT creates a secure, signed token representing the logged-in user.

---

### 📁 Folder Structure

```
dev-collab-platform/
├── backend/                  ← Node.js server
│   ├── config/               ← Configuration files (e.g., Database connection)
│   ├── controllers/          ← Business logic (What happens when a route is hit)
│   ├── middleware/           ← Security guards & error filters
│   ├── models/               ← Database Blueprints (Schemas)
│   ├── routes/               ← API Route endpoints (/api/auth, /api/projects)
│   ├── socket/               ← Real-time communication managers
│   ├── utils/                ← Helper utilities (e.g., Token generation)
│   ├── server.js             ← Main Entry Point of the server
│   └── package.json          ← Backend dependencies config
│
└── frontend/                 ← React app (Client)
    ├── public/               ← Static public assets (icons, images)
    ├── src/
    │   ├── components/       ← Reusable components (Navbar, Chat, Kanban, Monaco)
    │   │   └── ui/           ← Reusable design elements (GlassCard, Buttons, inputs)
    │   ├── context/          ← Global shared states (Authentication state, Theme)
    │   ├── hooks/            ← Custom React Hooks (useCollaboration, useExportFile)
    │   ├── pages/            ← Top-level page views (Dashboard, Login, Workspace)
    │   ├── services/         ← API communication layer (Axios setups)
    │   ├── socket/           ← WebSocket client setups
    │   ├── App.jsx           ← Main router configuration
    │   ├── main.jsx          ← React App entry point
    │   └── index.css         ← Global CSS styles & Tailwind setups
    ├── tailwind.config.js    ← TailwindCSS custom rules
    └── package.json          ← Frontend dependencies config
```

---

### 🏗️ Overall Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │                USER'S BROWSER                │
                  │  ┌────────────────────────────────────────┐  │
                  │  │               React App                │  │
                  │  │                                        │  │
                  │  │   [Components]           [Contexts]    │  │
                  │  │   - Monaco Editor        - Auth        │  │
                  │  │   - Kanban Board         - Theme       │  │
                  │  │   - ChatBox                            │  │
                  │  └──────────┬───────────────────▲─────────┘  │
                  └─────────────┼───────────────────┼────────────┘
                                │                   │
           REST API Requests    │                   │ WebSockets (Real-time)
           (HTTP POST/GET)      │                   │ (Events: codeChange, chat)
                                ▼                   ▼
                  ┌──────────────────────────────────────────────┐
                  │           EXPRESS & NODE.JS BACKEND          │
                  │                                              │
                  │   ┌──────────────────┐  ┌────────────────┐   │
                  │   │   REST Routes    │  │Socket.io Server│   │
                  │   │   & Controllers  │  │ (Active Rooms) │   │
                  │   └────────┬─────────┘  └────────────────┘   │
                  └────────────┼─────────────────────────────────┘
                               │
                       Mongoose queries
                               ▼
                  ┌──────────────────────────────────────────────┐
                  │                 MONGODB ATLAS                │
                  │  (Stores Users, Projects, Tasks, Messages)  │
                  └──────────────────────────────────────────────┘
```
