# PredictED - AI-Powered Academic Dashboard

A modern, minimal SaaS-style academic dashboard for college students featuring attendance analytics, bunk prediction, timetable management, assignment tracking, and an AI assistant.

![PredictED Dashboard](https://via.placeholder.com/800x400/0a0a0f/6366f1?text=PredictED)

---

## Overview

PredictED is a college mini-project that combines modern frontend design with practical academic management features. It provides students with intelligent attendance tracking, bunk prediction powered by Python/Pandas, and an optional AI chatbot using Ollama with Llama 3.

### Key Features

- **Dashboard** - Overview of attendance, assignments, notifications, and analytics
- **Attendance Tracker** - Subject-wise attendance with color-coded percentages
- **Bunk Predictor** - AI-powered prediction of how many classes you can miss
- **Timetable** - Weekly class schedule with room and faculty info
- **Assignment Tracker** - Track pending/completed assignments with due dates
- **AI Assistant** - Chatbot for study tips and academic guidance (requires Ollama)

---

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Recharts** - Analytics charts
- **Lucide React** - Icons

### Backend
- **Flask** - Python web framework
- **Pandas** - Data processing
- **CSV** - Data storage

### AI
- **Ollama** - Local AI runtime
- **Llama 3** - Language model

---

## Project Structure

```
PredictED/
├── README.md
├── SETUP.md
├── SPEC.md
├── backend/
│   ├── app.py              # Flask API server
│   ├── requirements.txt    # Python dependencies
│   └── data/
│       ├── students.csv    # Student records
│       ├── subjects.csv    # Subject details
│       ├── attendance.csv  # Attendance records
│       ├── timetable.csv  # Weekly schedule
│       ├── assignments.csv # Assignment list
│       └── notifications.csv
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   ├── Sidebar.jsx
        │   └── Chatbot.jsx
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Attendance.jsx
            ├── Timetable.jsx
            ├── Assignments.jsx
            └── Predictor.jsx
```

---

## Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **Ollama** (optional, for AI chatbot)

### Install Node.js
Download from [nodejs.org](https://nodejs.org/) or use:
```bash
# macOS with Homebrew
brew install node
```

### Install Python
Download from [python.org](https://www.python.org/) or use:
```bash
# macOS with Homebrew
brew install python
```

### Install Ollama (Optional)
Download from [ollama.ai](https://ollama.ai/) or use:
```bash
# macOS
brew install ollama
```

---

## Installation

### 1. Clone or Download the Project

```bash
cd PredictED
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. (Optional) Ollama Setup

For the AI chatbot to work:

```bash
# Pull the Llama 3 model
ollama pull llama3
```

---

## Running the Project

You need to run both the backend and frontend in separate terminals.

### Terminal 1 - Backend

```bash
cd backend
python app.py
```

You should see:
```
 * Running on http://127.0.0.1:5000
```

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:3000
```

### Open in Browser

Navigate to **http://localhost:3000**

---

## Login Credentials

The system uses a hardcoded USN login (no password required).

### Valid USNs:
- 1CR21CS001
- 1CR21CS002
- 1CR21CS003
- 1CR21CS004
- 1CR21CS005
- 1CR21CS006

**Password:** Can be anything (not validated)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Authenticate USN |
| GET | `/api/student/<usn>` | Get student details |
| GET | `/api/attendance/<usn>` | Get attendance records |
| GET | `/api/attendance-summary/<usn>` | Get overall attendance |
| GET | `/api/attendance-trend/<usn>` | Get attendance trend |
| GET | `/api/subjects` | Get all subjects |
| GET | `/api/timetable/<usn>` | Get weekly timetable |
| GET | `/api/assignments/<usn>` | Get assignments |
| PUT | `/api/assignments/<id>` | Update assignment status |
| GET | `/api/notifications/<usn>` | Get notifications |
| POST | `/api/predict` | Calculate bunk prediction |
| POST | `/api/chat` | AI chatbot (requires Ollama) |

---

## Features Walkthrough

### 1. Login Page
- Enter any valid USN (e.g., 1CR21CS001)
- Password can be anything
- Click "Sign In" to access the dashboard

### 2. Dashboard
- Welcome message with student name
- Stats cards: Overall attendance, classes attended, classes missed, risk subjects
- Attendance trend line chart
- Subject-wise bar chart
- Risk alerts for low attendance subjects
- Upcoming assignments
- Recent notifications

### 3. Attendance Tracker
- Table view of all subjects
- Shows: Subject name, faculty, total classes, present/absent, percentage
- Color-coded status (green ≥75%, amber 60-75%, red <60%)
- Progress bar for each subject

### 4. Timetable
- Day-wise class schedule
- Shows: Time slot, subject name, room, faculty
- Weekly overview grid at bottom

### 5. Assignments
- List of assignments with title, subject, due date, priority
- Filter by: All, Pending, Completed
- Mark as complete with checkbox
- Due date countdown indicators

### 6. Bunk Predictor
- Adjustable target attendance slider (50-100%)
- Cards showing: Safe, Warning, Critical counts
- Per-subject prediction with:
  - Current percentage
  - Classes that can be missed
  - Classes needed to reach target
  - Status indicator

### 7. AI Chatbot
- Click the floating button in bottom-right
- Chat interface with message history
- Powered by Ollama + Llama 3
- Fallback responses if Ollama is unavailable
- Topics: study tips, attendance advice, productivity

---

## Troubleshooting

### Frontend won't start?
- Ensure Node.js is installed: `node --version`
- Reinstall dependencies: `cd frontend && npm install`

### Backend errors?
- Ensure Python is installed: `python --version`
- Install requirements: `cd backend && pip install -r requirements.txt`

### API not responding?
- Check backend is running on port 5000
- Check for port conflicts

### AI chatbot not working?
- Ensure Ollama is installed and running: `ollama serve`
- Ensure Llama 3 model is pulled: `ollama pull llama3`
- If still not working, the chatbot will show fallback responses

### Port already in use?
- Change backend port in `backend/app.py`
- Update frontend proxy in `frontend/vite.config.js`

---

## Customization

### Adding More USNs
Edit `backend/app.py` and add USNs to `VALID_USNS` list:
```python
VALID_USNS = ['1CR21CS001', '1CR21CS002', '1CR21CS003', '1CR21CS007', '1CR21CS008']
```

### Adding More Subjects/Attendance
Edit the CSV files in `backend/data/`:
- `subjects.csv` - Add new subjects
- `attendance.csv` - Add attendance records

### Changing Theme Colors
Edit `tailwind.config.js` in `frontend/`:
```javascript
colors: {
  accent: {
    primary: '#6366f1',  // Change primary accent
    secondary: '#8b5cf6',
  },
  // ... other colors
}
```

---

## License

This project is created for educational purposes as a college mini-project.

---

## Credits

- Design inspired by Linear, Vercel, and Notion dashboards
- Icons by Lucide React
- Charts by Recharts
- Animations by Framer Motion