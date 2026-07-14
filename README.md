# TaskGenius

> **Don't Just Remind. Rescue.**

TaskGenius is a production-ready, AI-powered productivity companion that doesn't just send reminders—it proactively helps users complete their tasks before deadlines. Built with a premium SaaS-grade UI/UX, it features an intelligent AI coach, emergency rescue mode, voice assistant, and comprehensive task management.

---

## Features

### AI-Powered
- **AI Chat Assistant** - Conversational AI that acts as a personal productivity coach
- **Smart Task Analysis** - Automatic task priority, risk, and deadline analysis
- **Daily Briefing** - AI-generated morning briefings with personalized recommendations
- **AI Insights** - Proactive insights about productivity patterns and risks
- **Emergency Rescue** - AI-generated step-by-step action plans for critical deadlines
- **Voice Assistant** - Speech-to-text and text-to-speech with Bengali/English support

### Task Management
- Create, edit, delete, and complete tasks
- Priority levels: Low, Medium, High, Critical
- Categories, deadlines, estimated duration
- Subtasks, notes, and attachments
- Smart filtering and search
- Calendar view (Monthly/Weekly/Daily)

### Emergency Rescue Mode
- **Full-screen red alert** when deadlines are critically close
- **Animated countdown timer** with alarm sounds
- **AI emergency action plan** for last-minute rescue
- **Browser notifications** and auto-refresh
- "I'm Done" completion tracking

### Analytics
- Productivity charts and trends
- Completion rates and missed deadlines
- Category breakdown
- Weekly and monthly reports
- Focus session tracking

### Focus Mode
- Pomodoro timer (25 min focus / 5 min break)
- Session tracking
- Productive time analytics

### Authentication
- JWT-based authentication
- Register, Login, Profile management
- Password update
- Voice settings customization

### UI/UX
- Premium glassmorphism design
- White/Soft Gray/Light Blue theme
- Framer Motion animations
- Fully responsive (Mobile/Tablet/Desktop)
- Skeleton loading states
- Empty states and error pages
- Toast notifications

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 19 | UI Framework |
| Vite | Build Tool |
| Tailwind CSS v4 | Styling |
| Framer Motion | Animations |
| React Router | Routing |
| Axios | HTTP Client |
| React Hook Form | Form Validation |
| React Hot Toast | Notifications |
| Recharts | Charts |
| Lucide React | Icons |
| date-fns | Date Utilities |

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js | Runtime |
| Express.js | Web Framework |
| MongoDB | Database |
| Mongoose | ODM |
| JWT | Authentication |
| bcryptjs | Password Hashing |
| Helmet | Security Headers |
| CORS | Cross-Origin Resource Sharing |
| Morgan | Logging |
| express-rate-limit | Rate Limiting |
| express-validator | Input Validation |

### AI
| Technology | Purpose |
|-----------|---------|
| Google Gemini API | AI Chat & Analysis |
| Web Speech API | Voice Recognition |
| Speech Synthesis API | Voice Output |

---

## Database Selection: MongoDB

After careful analysis, **MongoDB** was selected as the database for TaskGenius. Here's the reasoning:

### Why MongoDB?

1. **Flexible Schema**: AI chat history, notifications, and analytics data vary in structure. MongoDB's document model handles this naturally without migrations.

2. **Scalability**: TaskGenius will grow with each user creating hundreds of tasks, AI interactions, and analytics records. MongoDB's horizontal scaling via sharding is ideal.

3. **Performance**: Document-based storage allows embedding related data (subtasks, notes within tasks) reducing JOIN operations.

4. **AI Data**: AI conversation history and insights have varying structures. MongoDB's flexible schema is perfect for storing unstructured AI response data.

5. **JSON-like Documents**: Natural mapping between Node.js objects and database documents, reducing impedance mismatch.

6. **MongoDB Atlas**: Managed cloud service with built-in backups, monitoring, and auto-scaling for production deployment.

### Data Collections
- **Users** - User profiles and authentication
- **Tasks** - Task management with embedded subtasks and notes
- **Notifications** - User notifications with varying types
- **AiHistory** - AI conversation history with flexible metadata
- **Analytics** - Daily productivity analytics

---

## Project Structure

```
taskgenius/
├── client/                          # React Frontend
│   ├── public/
│   │   ├── favicon.svg
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.jsx
│   │   │   │   ├── Navbar.jsx
│   │   │   │   └── Sidebar.jsx
│   │   │   └── EmergencyRescue.jsx
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── TasksPage.jsx
│   │   │   ├── AiChatPage.jsx
│   │   │   ├── CalendarPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── FocusModePage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   ├── useDashboard.js
│   │   │   ├── useNotifications.js
│   │   │   └── useTasks.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── styles/
│   │   │   └── index.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                          # Express Backend
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── aiController.js
│   │   ├── analyticsController.js
│   │   ├── authController.js
│   │   ├── notificationController.js
│   │   └── taskController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── validate.js
│   ├── models/
│   │   ├── AiHistory.js
│   │   ├── Analytics.js
│   │   ├── Notification.js
│   │   ├── Task.js
│   │   └── User.js
│   ├── routes/
│   │   ├── ai.js
│   │   ├── analytics.js
│   │   ├── auth.js
│   │   ├── notifications.js
│   │   └── tasks.js
│   ├── utils/
│   │   └── helpers.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

---

## Installation Guide

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)
- Gemini API Key

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/taskgenius.git
cd taskgenius
```

### 2. Backend Setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/taskgenius
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
GEMINI_API_KEY=your-gemini-api-key
CLIENT_URL=http://localhost:5173
```

### 3. Frontend Setup

```bash
cd client
npm install
```

### 4. Run Development

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev
```

Frontend: http://localhost:5173
Backend API: http://localhost:5000/api

---

## API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Updated",
  "goals": "Complete 5 tasks daily",
  "dailyTarget": 5
}
```

#### Update Password
```http
PUT /api/auth/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpass",
  "newPassword": "newpass123"
}
```

#### Update Voice Settings
```http
PUT /api/auth/voice-settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "muted": false,
  "language": "en",
  "volume": 1
}
```

### Tasks

#### Get All Tasks
```http
GET /api/tasks?status=pending&priority=high&category=work&search=assignment&sort=deadline
Authorization: Bearer <token>
```

#### Get Dashboard
```http
GET /api/tasks/dashboard
Authorization: Bearer <token>
```

#### Get Single Task
```http
GET /api/tasks/:id
Authorization: Bearer <token>
```

#### Create Task
```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Complete Project Report",
  "description": "Write the final report",
  "priority": "high",
  "category": "work",
  "deadline": "2024-12-31T23:59:00.000Z",
  "estimatedDuration": 120,
  "subtasks": [
    { "title": "Research" },
    { "title": "Draft" }
  ]
}
```

#### Update Task
```http
PUT /api/tasks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed",
  "priority": "critical"
}
```

#### Delete Task
```http
DELETE /api/tasks/:id
Authorization: Bearer <token>
```

### AI Features

#### Chat with AI
```http
POST /api/ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "What should I do today?",
  "sessionId": "session-123"
}
```

#### Get Daily Briefing
```http
GET /api/ai/briefing
Authorization: Bearer <token>
```

#### Get AI Insights
```http
GET /api/ai/insights
Authorization: Bearer <token>
```

#### Analyze Task
```http
GET /api/ai/analyze/:taskId
Authorization: Bearer <token>
```

#### Get Chat History
```http
GET /api/ai/history?sessionId=session-123
Authorization: Bearer <token>
```

#### Clear History
```http
DELETE /api/ai/history
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "session-123"
}
```

### Notifications

#### Get Notifications
```http
GET /api/notifications?read=false&limit=10
Authorization: Bearer <token>
```

#### Get Unread Count
```http
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

#### Mark as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

#### Mark All as Read
```http
PUT /api/notifications/read-all
Authorization: Bearer <token>
```

#### Delete Notification
```http
DELETE /api/notifications/:id
Authorization: Bearer <token>
```

### Analytics

#### Get Analytics
```http
GET /api/analytics?period=weekly
Authorization: Bearer <token>
```

#### Get Productivity Stats
```http
GET /api/analytics/stats
Authorization: Bearer <token>
```

### Health Check

```http
GET /api/health
```

---

## Deployment Guide

### Backend (Render)

1. Create a new Web Service on Render
2. Connect your repository
3. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Add Environment Variables:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `CLIENT_URL` (your Vercel frontend URL)
   - `NODE_ENV=production`

### Frontend (Vercel)

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy:
   ```bash
   cd client
   vercel --prod
   ```
3. Configure Environment Variables:
   - `VITE_API_URL` = your Render backend URL

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | Environment mode |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `JWT_EXPIRE` | No | Token expiry (default: 7d) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `CLIENT_URL` | Yes | Frontend URL for CORS |
| `VITE_API_URL` | Yes | Backend API URL (frontend) |

---

## Voice Assistant

TaskGenius features a built-in voice assistant using the Web Speech API.

### Features
- **Speech-to-Text**: Speak your questions to the AI assistant
- **Text-to-Speech**: AI responses are read aloud naturally
- **Multilingual**: Supports English and Bengali
- **Emergency Voice Alerts**: AI announces critical deadline warnings
- **Mute/Snooze**: Control voice notifications

### Usage
- Click the microphone icon in the AI Chat to start voice input
- Toggle voice responses with the speaker icon
- Configure voice settings in Profile > Voice Settings

---

## Color Theme

| Color | Usage |
|-------|-------|
| `#ffffff` | Surface / Cards |
| `#f8fafc` | Page Background |
| `#f1f5f9` | Hover / Tertiary |
| `#2563eb` | Primary Brand |
| `#1d4ed8` | Primary Dark |
| `#0f172a` | Primary Text |
| `#475569` | Secondary Text |
| `#22c55e` | Success / Completed |
| `#ef4444` | Danger / Emergency |
| `#f59e0b` | Warning |

---

## License

MIT

---

## Support

For support, please open an issue on the GitHub repository or contact the development team.
