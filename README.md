# SyncSpace 🚀

**Real-time Team Collaboration & Messaging Platform**

SyncSpace is a full-stack real-time chat application built with React, Node.js, Socket.io and MongoDB. It supports workspaces, channels, direct messages, file sharing, emoji reactions, thread replies, and live notifications — similar to Slack and Discord.

---

## Live Demo

> Coming soon

---

## Screenshots

> Add screenshots here after deployment

---

## Features

- **Authentication** — Secure signup and login with JWT tokens
- **Workspaces** — Create workspaces, invite others via join requests (accept or reject)
- **Channels** — Create and delete public channels inside workspaces
- **Direct Messages** — Private one-on-one conversations between users
- **Real-time Messaging** — Messages appear instantly using Socket.io
- **File Sharing** — Send images, PDFs and documents in chat
- **Emoji Reactions** — React to any message with emojis, live updates for all users
- **Thread Replies** — Reply to messages in a dedicated thread panel
- **Live Notifications** — Bell icon counter and notification card with message previews
- **Online Users** — See who is currently online in real time
- **Typing Indicators** — See when someone else is typing
- **Edit and Delete** — Edit or delete your own messages
- **Message Search** — Search messages and scroll to the result in chat
- **Dark and Light Mode** — Toggle between themes, preference saved
- **Profile Management** — Update display name and profile picture, updates everywhere instantly
- **Friend Requests** — Send, accept, and reject friend requests

---

## Tech Stack

### Frontend
- React 19 with Vite
- Tailwind CSS
- Socket.io Client
- Axios
- React Icons

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Socket.io
- JSON Web Tokens (JWT)
- bcryptjs

---

## Project Structure

```
syncspace/
├── client/                        # React frontend
│   ├── public/
│   │   └── logo.png
│   └── src/
│       ├── components/
│       │   ├── chat/              # ChatHeader, MessageList, MessageInput, ThreadPanel
│       │   ├── dashboard/         # BottomPanel, ProfileCard, FileShareCard
│       │   ├── layout/            # AppLayout, Sidebar, ChannelList
│       │   ├── notifications/     # NotificationsPanel
│       │   └── user/              # OnlineUser
│       ├── context/               # AuthContext, SocketContext
│       ├── hooks/                 # useSocket, useTyping
│       ├── pages/                 # Chat, Login, Register
│       ├── services/              # api.js, socket.js
│       └── styles/                # index.css with dark and light mode variables
│
└── server/                        # Node.js backend
    ├── config/                    # db.js — MongoDB connection
    ├── controllers/               # auth, channel, message, user, workspace
    ├── middleware/                # authMiddleware
    ├── models/                    # User, Message, Channel, Workspace, Notification
    ├── routes/                    # all API routes
    ├── sockets/                   # socketHandler.js
    └── server.js                  # entry point
```

---

## Getting Started

### Requirements

- Node.js version 18 or higher
- MongoDB installed locally or a free MongoDB Atlas account
- Git

### Step 1 — Clone the project

```bash
git clone https://github.com/YOUR_USERNAME/syncspace.git
cd syncspace
```

### Step 2 — Setup the backend

```bash
cd server
npm install
```

Create a file called `.env` inside the `server` folder and add this:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/syncspace
JWT_SECRET=write_any_long_random_secret_here
```

Start the server:

```bash
npm start
```

You should see this in the terminal:
```
Server running on http://localhost:5000
MongoDB Connected Successfully
```

### Step 3 — Setup the frontend

Open a second terminal window:

```bash
cd client
npm install
npm run dev
```

Open your browser and go to `http://localhost:5173`

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Port the backend runs on | 5000 |
| MONGO_URI | MongoDB connection string | mongodb://127.0.0.1:27017/syncspace |
| JWT_SECRET | Secret key for JWT tokens | any_long_random_string |

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login user |
| GET | /api/users | Get all users |
| PUT | /api/users/profile | Update name and avatar |
| GET | /api/workspaces | Get my workspaces |
| POST | /api/workspaces | Create a workspace |
| DELETE | /api/workspaces/:id | Delete a workspace |
| POST | /api/workspaces/join-request | Send workspace join request |
| POST | /api/workspaces/join-request/accept | Accept join request |
| POST | /api/workspaces/join-request/reject | Reject join request |
| GET | /api/channels/:workspaceId | Get channels in workspace |
| POST | /api/channels | Create a channel |
| DELETE | /api/channels/:id | Delete a channel |
| POST | /api/channels/dm | Create or get DM channel |
| GET | /api/messages/channel/:id | Get messages in channel |

---

## Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| sendMessage | Client to Server | Send a message |
| receiveMessage | Server to Client | Receive a new message |
| joinChannel | Client to Server | Join a channel room |
| typing | Client to Server | User is typing |
| userTyping | Server to Client | Show typing indicator to others |
| reactMessage | Client to Server | React to a message with emoji |
| messageReacted | Server to Client | Reaction updated for all users |
| userOnline | Server to Client | User came online |
| userOffline | Server to Client | User went offline |
| workspaceJoinRequest | Server to Client | Owner receives join request |
| workspaceRequestAccepted | Server to Client | User request was accepted |
| userProfileUpdated | Server to Client | Profile name or avatar changed |

---

## Author

**Saad Memon**
- GitHub: [@saadmemon11](https://github.com/saadmemon11)

---

## License

This project is open source under the MIT License.

---

Built with React, Node.js and Socket.io