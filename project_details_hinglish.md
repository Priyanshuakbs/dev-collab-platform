# 🛠️ DevCollab Platform — Techstack, Libraries, Workflow & Architecture

Hii! Is document mein humne aapke project ke **Techstack, Libraries, Workflows, aur Architecture** ko bilkul simple **Hinglish** mein explain kiya hai, taaki aapko internal systems aaram se samajh aa sakein.

---

## 1. 🛠️ Techstack (Kis Technology Se Kya Bana Hai?)

Aapka project ek **MERN Stack** application hai. MERN ka matlab hai:
* **M - MongoDB:** Humara NoSQL Database jismein data JSON-like format (BSON) mein store hota hai.
* **E - Express.js:** Node.js ka ek lightweight web framework jo backend APIs routing ko simple banata hai.
* **R - React.js:** Frontend UI components banane ke liye. Vite build tool ke sath client chal raha hai.
* **N - Node.js:** JavaScript ka runtime environment jo backend server chalata hai.

### Database Layer
* **MongoDB Atlas (Cloud Database):** Production ya development data save karne ke liye.
* **Mongoose:** Ek Object Data Modeling (ODM) library hai. Yeh MongoDB ke models aur schemas ko define karne aur validate karne ka kaam karti hai.

### Server Layer
* **Express Server:** Port `5000` par run hota hai aur HTTP requests (GET, POST, PUT, DELETE) handle karta hai.
* **Socket.io Server:** WebSockets connections ke liye, jo port `5000` par Express ke sath binded hai.

### Client Layer (Frontend)
* **Vite React Dev Server:** Port `5173` par run hota hai aur single-page application (SPA) ko render karta hai.

---

## 2. 📚 Libraries & Dependencies (Kaunsi Library Kya Kaam Karti Hai?)

Humare `package.json` files ke hisab se, niche likhi libraries humare system ka core hain:

### 🖥️ Backend Libraries

| Library Name | Kaam Kya Hai? | Kyun Zaruri Hai? | Alternative Kya Ho Sakta Tha? |
| :--- | :--- | :--- | :--- |
| **`express`** | Routing aur controllers setup karta hai. | Iske bina raw Node.js script likhni padti jo bohot complex ho jati. | Fastify, NestJS |
| **`mongoose`** | Database schema rules define karta hai (e.g., Email is required). | MongoDB raw queries se save hone wale data par rules lagata hai. | MongoDB Native Driver |
| **`socket.io`** | WebSockets server connection banata hai. | Chat aur code editor ke live synchronization ke liye instant message flows chalata hai. | Raw WebSockets (`ws`) |
| **`jsonwebtoken`** | User login ke baad encrypted token (JWT) generate karta hai. | User identity ko verify karne ke liye safe system hai (Stateless Auth). | Session Cookies, Firebase Auth |
| **`bcryptjs`** | Passwords ko database mein save karne se pehle hash (encrypt) karta hai. | Security ke liye. Agar database hack bhi ho jaye toh passwords leak nahi honge. | Node.js native `crypto` |
| **`cors`** | Cross-Origin Resource Sharing ko control karta hai. | Browser validation ke liye taaki frontend server backend se connect ho sake. | Custom middleware headers |
| **`dotenv`** | `.env` file se private keys aur database links process environment mein load karta hai. | Database passwords aur secrets code ke andar leak hone se bachata hai. | None (standard practice) |
| **`nodemon`** (dev) | Server code change hone par server ko automatically restart karta hai. | Dev speed badhane ke liye. | `node --watch` (in newer Node versions) |

---

### 🎨 Frontend Libraries

| Library Name | Kaam Kya Hai? | Kyun Zaruri Hai? |
| :--- | :--- | :--- |
| **`react-router-dom`** | Client-side routing handle karta hai. | Bina page reload kiye `/login` se `/dashboard` par redirect karne ke liye. |
| **`axios`** | HTTP requests backend par bhejta hai. | API se data lane (fetch) aur bhejne (post) ka kaam standard tarike se karta hai. |
| **`socket.io-client`** | Frontend ko Backend WebSocket Server se connect karta hai. | Real-time chat aur code updates ko instantly receive aur send karne ke liye. |
| **`@monaco-editor/react`** | Browser mein VS Code wala code editor interface render karta hai. | Developer experience dene ke liye jismein syntax highlighting aur code line numbers milte hain. |
| **`@hello-pangea/dnd`** | Kanban Board mein cards ko drag aur drop karne ke liye support. | Smooth visual management dashboard dene ke liye. (Fork of react-beautiful-dnd) |
| **`framer-motion`** | High-quality UI transitions aur smooth cards movement animations. | Application ko modern aur premium premium look-and-feel dene ke liye. |
| **`tailwindcss`** | CSS components aur responsive screens styling framework. | Fast UI building ke liye (Flexbox, grids, media queries directly in HTML classes). |

---

## 3. 🔄 Workflow (Application Kaise Kaam Karti Hai?)

Humare system mein data flow 2 tarah ke channels se hota hai: **REST API Flow** aur **WebSocket Flow**.

### A. Authentication & Navigation Flow (REST API)
```
[User Signup / Login] 
        │
        ▼
[Axios sends POST to /api/auth/login] 
        │
        ▼
[Backend: bcrypt verifies password & Mongoose finds User]
        │
        ▼
[Backend: JWT signed & sent back as response]
        │
        ▼
[Frontend: JWT Token saved in LocalStorage & AuthContext state gets User]
        │
        ▼
[React Router unlocks /dashboard and redirects user]
```

### B. Project & Task Management Flow (REST API)
1. **Project Creation:** User page par click karke details fill karta hai. `axios.post('/api/projects')` hit hoti hai. Backend use database mein save karta hai aur project state update ho jata hai.
2. **Project Invitation:** Owner kisi user ko invite karta hai -> `Invitation` entry database mein save hoti hai -> Jise receiver `/invitations` page par accept karta hai -> Receiver's ID project's `collaborators` array mein update ho jata hai.

### C. Workspace Collaboration Flow (Real-time Socket Connection)
Jab user kisi workspace (Project Workspace) page par enter karta hai, tab WebSocket ka main real-time game chalu hota hai:

```
[User visits /workspace/:id]
        │
        ├─► [REST APIs load previous Workspace Files & Tasks from DB]
        │
        └─► [Socket connection initializes via connectSocket()]
                   │
                   ▼
            [Sends event: socket.emit("joinWorkspace", { workspaceId, userId })]
                   │
                   ▼
            [Backend joins user to a Room corresponding to that workspaceId]
                   │
                   ▼
  ┌────────────────┴────────────────────────────────────────┐
  │                                                         │
  ▼ (Collaborator types code)                               ▼ (User sends Chat message)
[Monaco Editor triggers codeChange event]            [Chat box emits sendMessage]
  │                                                         │
  ▼                                                         ▼
[Socket sends code to Backend server]                 [Backend saves message to DB &]
  │                                                   [broadcasts receiveMessage event]
  ▼                                                         │
[Backend broadcasts remoteCodeChange to room]               ▼
  │                                                   [All users in room see new message]
  ▼
[Collaborator's editor updates live in browser]
```

---

## 4. 🏗️ Architecture & Design (Design System)

### Layout & Page Hierarchy
1. **Public Routes:** `LandingPage.jsx`, `Login.jsx`, `Register.jsx`.
2. **Protected Layout Wrapper (`WithNavbar`):** Jo dashboard aur workspace panels ke upar `Navbar.jsx` render karta hai aur security check karta hai (`ProtectedRoute.jsx`).
3. **State Management Design (React Context API):**
   * **`AuthContext.jsx`**: User login/logout global state aur data access ke liye.
   * **`ThemeContext.jsx`**: Dark Mode/Light Mode toggling manage karta hai. HTML body par `'dark'` class toggle karke Tailwind variables apply karta hai.

### WebSocket Room Architecture
* Backend server par hum direct single channel messaging ke bajaye **Rooms** use karte hain.
* Jab user workspace `60abc123...` open karta hai, toh backend code user ko usi `workspaceId` ke room mein join karata hai (`socket.join(workspaceId)`).
* Aisa karne se editor aur chat updates sirf usi project ke users ko milte hain, kisi aur dusre project ke users ko disturb nahi kiya jata.

### Database Design Relationship (Entity Relationship)
* **User (1) ── (Many) Project**: User projects create kar sakta hai.
* **Project (1) ── (1) Workspace**: Har project ke backend par ek default active workspace generate hoti hai.
* **Workspace (1) ── (Many) File**: Workspace ke andar multiple files ho sakti hain.
* **Workspace (1) ── (Many) Task**: Kanban board tasks workspace se linked hote hain.
* **Workspace (1) ── (Many) Message**: Live chat history store hoti hai.
