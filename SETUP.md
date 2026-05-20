# PredictED - Setup Instructions

## Prerequisites

1. **Node.js** (v18+) - [Download](https://nodejs.org/)
2. **Python** (v3.8+) - [Download](https://www.python.org/)
3. **Ollama** (for AI Chatbot) - [Download](https://ollama.ai/)

## Installation Steps

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

### 3. Start Ollama (for AI Chatbot)

```bash
# Download and run Llama 3 model
ollama pull llama3
ollama serve
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Valid USNs for Login

- 1CR21CS001
- 1CR21CS002
- 1CR21CS003
- 1CR21CS004
- 1CR21CS005
- 1CR21CS006

(Password can be anything)

## Features

- **Dashboard**: Overview of attendance, upcoming assignments, notifications
- **Attendance Tracker**: View subject-wise attendance with percentages
- **Timetable**: Weekly class schedule
- **Assignments**: Track pending and completed assignments
- **Bunk Predictor**: AI-powered prediction of attendance
- **AI Chatbot**: Ollama-powered academic assistant

## Troubleshooting

### Ollama not responding?
Make sure Ollama is running: `ollama serve`

### API errors?
Ensure backend is running on port 5000

### Frontend not loading?
Ensure you're using Node 18+ and ran `npm install`