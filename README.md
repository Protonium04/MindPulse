# 🧠 MindPulse — Mental Wellness Companion

An empathetic AI system for emotion understanding and support. MindPulse detects your emotional state by analysing:
- 💬 **Your text** — via NLP (DistilRoBERTa)
- 🎵 **Your music** — via Spotify audio features (valence, energy)
- 📺 **Your YouTube** — via watch history sentiment analysis

Then it uses **LangChain + GPT-4** to generate a compassionate response, personalised coping steps, and doctor referral when needed.

---

## 🗂 Project Structure

```
mental-wellness/
├── backend/                        # FastAPI Python backend
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── core/
│   │   │   ├── config.py           # Settings (pydantic-settings)
│   │   │   ├── database.py         # MongoDB/Beanie connection
│   │   │   └── security.py         # JWT auth + password hashing
│   │   ├── models/
│   │   │   ├── user.py             # User document model
│   │   │   ├── session.py          # EmotionSession document model
│   │   │   └── chat.py             # ChatMessage document model
│   │   ├── services/
│   │   │   ├── nlp_service.py      # HuggingFace emotion detection
│   │   │   ├── spotify_service.py  # Spotify Web API integration
│   │   │   ├── youtube_service.py  # YouTube Data API v3 integration
│   │   │   └── fusion_service.py   # Multi-modal emotion fusion
│   │   ├── chains/
│   │   │   └── wellness_chain.py   # LangChain + GPT-4 response chain
│   │   └── api/routes/
│   │       ├── auth.py             # Register / Login / Me
│   │       ├── chat.py             # POST /chat/message (main endpoint)
│   │       ├── spotify.py          # Spotify OAuth + data routes
│   │       ├── youtube.py          # YouTube OAuth + data routes
│   │       └── analytics.py        # Emotion history + summary
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                       # React + Vite frontend
│   ├── src/
│   │   ├── main.jsx                # React entry point
│   │   ├── App.jsx                 # Router + route guards
│   │   ├── index.css               # Global styles + design tokens
│   │   ├── pages/
│   │   │   ├── Login.jsx           # Sign in page
│   │   │   ├── Register.jsx        # Sign up page
│   │   │   ├── Dashboard.jsx       # Wellness overview
│   │   │   ├── Chat.jsx            # Main chat interface
│   │   │   ├── Analytics.jsx       # Emotion timeline + charts
│   │   │   └── Connections.jsx     # Spotify/YouTube OAuth manager
│   │   ├── components/common/
│   │   │   └── Layout.jsx          # Sidebar + navigation
│   │   ├── context/
│   │   │   ├── authStore.js        # Zustand auth store
│   │   │   └── chatStore.js        # Zustand chat store
│   │   └── utils/
│   │       ├── api.js              # Axios client + all API calls
│   │       └── emotions.js         # Emotion metadata + helpers
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── docker-compose.yml              # Full stack with MongoDB + Redis
├── start.sh                        # One-click start (Mac/Linux)
├── start.bat                       # One-click start (Windows)
└── README.md
```

---

## ⚙️ Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.10+ | Backend |
| Node.js | 18+ | Frontend |
| MongoDB | 7+ | Database |
| Git | any | Clone repo |

---

## 🔑 API Keys You Need

### 1. OpenAI API Key
1. Go to [platform.openai.com](https://platform.openai.com/api-keys)
2. Create API key → copy it
3. Paste into `backend/.env` as `OPENAI_API_KEY`

### 2. Spotify (for music mood analysis)
1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create App → set Redirect URI to `http://localhost:8000/api/v1/spotify/callback`
3. Copy Client ID and Client Secret → paste into `.env`

### 3. YouTube / Google (for watch history)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → Enable **YouTube Data API v3**
3. Create OAuth 2.0 credentials → set Redirect URI to `http://localhost:8000/api/v1/youtube/callback`
4. Copy Client ID and Secret → paste into `.env`

---

## 🚀 Quick Start (Without Docker)

### Step 1 — Clone and configure
```bash
git clone https://github.com/Protonium04/MindPulse
cd mental-wellness
cp backend/.env.example backend/.env
# Edit backend/.env and fill in ALL API keys
```

### Step 2 — Start MongoDB locally
```bash
# macOS with Homebrew
brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod

# Windows — start MongoDB service from Services panel
```

### Step 3 — Run the one-click script
```bash
# Mac / Linux
chmod +x start.sh
./start.sh

# Windows
start.bat
```

That's it! The script installs deps and starts both servers.

---

## 🐳 Docker (Recommended)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

---

## 📖 Manual Setup

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # fill in API keys
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing the App

1. Open http://localhost:5173
2. Register a new account
3. (Optional) Connect Spotify and YouTube in the **Connections** page
4. Go to **Talk to MindPulse** and type something like:
   - *"I've been feeling really low lately and nothing seems to make me happy"*
   - *"I'm so angry at everything today"*
   - *"I feel exhausted and drained all the time"*
5. Watch MindPulse detect your emotion, fuse it with music/video signals, and respond with coping steps
6. Visit **Analytics** to see your emotion timeline

---

## 🧠 How Emotion Detection Works

```
User text  ──→ DistilRoBERTa ──→ {sadness: 0.72, fear: 0.15, ...}  (weight: 50%)
Spotify    ──→ valence+energy ──→ {sadness: 0.60, neutral: 0.30}   (weight: 30%)
YouTube    ──→ title NLP     ──→ {sadness: 0.45, anger: 0.20}      (weight: 20%)
                                        ↓
                              Weighted fusion → dominant emotion + distress score
                                        ↓
                         LangChain prompt → GPT-4o-mini
                                        ↓
                     Empathetic reply + 3 coping steps + escalation flag
```

### Escalation triggers doctor referral when:
- Single session distress score ≥ 0.60
- OR 3+ consecutive sessions above threshold

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login (returns JWT) |
| GET  | `/api/v1/auth/me` | Current user |
| POST | `/api/v1/chat/message` | **Main endpoint** — send message |
| GET  | `/api/v1/chat/history` | Chat history |
| GET  | `/api/v1/spotify/connect` | Get Spotify OAuth URL |
| GET  | `/api/v1/spotify/callback` | OAuth callback |
| GET  | `/api/v1/youtube/connect` | Get YouTube OAuth URL |
| GET  | `/api/v1/youtube/callback` | OAuth callback |
| GET  | `/api/v1/analytics/emotion-history` | Emotion timeline |
| GET  | `/api/v1/analytics/summary` | 30-day summary |

Full interactive docs at http://localhost:8000/docs

---

## 🛠 Tech Stack

### Backend
- **FastAPI** — async Python API framework
- **LangChain** — LLM orchestration + conversation memory
- **OpenAI GPT-4o-mini** — empathetic response generation
- **HuggingFace Transformers** — `j-hartmann/emotion-english-distilroberta-base`
- **MongoDB + Beanie** — document database + async ODM
- **JWT + Bcrypt** — authentication

### Frontend
- **React 18** + **Vite** — fast dev build
- **Tailwind CSS** — utility-first styling
- **Framer Motion** — animations
- **Recharts** — emotion timeline charts
- **Zustand** — lightweight state management
- **React Router v6** — client-side routing

---

## 🔮 Future Improvements
- Voice input (Web Speech API)
- Wearable data integration (heart rate, sleep)
- Weekly wellness reports via email
- Therapist directory integration
- Multi-language support

---

## ⚠️ Disclaimer

MindPulse is an academic project and is **not a substitute for professional mental health care**.
If you are in crisis, please contact a licensed therapist or call a helpline:
- **iCall (India):** 9152987821
- **Vandrevala Foundation:** 1860-2662-345
- **International:** https://www.findahelpline.com
