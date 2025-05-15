# ORB\_DECK – AI-Powered Pitch Deck Generator

## 1. Key Technologies

* **ag-ui Protocol**
  Event-driven UI framework for building AI-powered interfaces
* **LangChain**
  Framework for developing applications powered by language models
* **LangGraph**
  State-machine framework for orchestrating complex AI workflows
* **CopilotKit**
  AI assistant integration for enhanced user experience
* **NestJS**
  Progressive Node.js framework for building efficient server-side applications
* **Next.js**
  Production-ready React framework for web applications
* **Prisma**
  Modern database toolkit and ORM
* **Socket.io**
  Real-time bidirectional event-based communication

## 2. Install Dependencies

1. **Install pnpm** (if not already installed)

   ```bash
   npm install -g pnpm
   ```

2. **Install project dependencies**

   ```bash
   pnpm install
   ```

## 3. Environment Configuration

### Backend (`apps/agent-backend/.env`)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/orb_deck"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4-turbo"

# Tavily Research API
TAVILY_API_KEY="your-tavily-api-key"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRATION="1d"

# (Optional) Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/auth/google/callback"
```

## 4. 🔧 Core Features

### AI Agent Workflow

1. **Market Research**
   Uses Tavily API to gather industry insights
2. **Outline Creation**
   AI generates deck structure and narrative
3. **Content Generation**
   Creates individual slides with AI
4. **Refinement**
   Human-in-the-loop feedback and AI refinement
5. **Export**
   Multiple format support (PDF, PPTX, Google Slides)

### ag-ui Protocol Integration

* Real-time streaming of AI responses
* Event-driven UI updates
* Progress tracking during generation
* Interactive refinement workflows

### Authentication System

* JWT-based authentication
* Google OAuth integration
* Secure password hashing with bcrypt
* Protected API routes

## 5. 🔌 WebSocket Events

### Client → Server

| Event               | Payload                | Description               |
| ------------------- | ---------------------- | ------------------------- |
| `workflow:start`    | `{ deckOptions }`      | Start deck generation     |
| `workflow:cancel`   | `{ workflowId }`       | Cancel ongoing generation |
| `human:input`       | `{ feedback }`         | Provide user feedback     |
| `workflow:feedback` | `{ slideId, changes }` | Submit refinements        |

### Server → Client

| Event                 | Payload                      | Description          |
| --------------------- | ---------------------------- | -------------------- |
| `workflow.start`      | `{ workflowId }`             | Workflow initialized |
| `state.update`        | `{ currentState, progress }` | State change update  |
| `slide.generated`     | `{ slideId, content }`       | Slide created        |
| `workflow.complete`   | `{ outputUrls }`             | Generation complete  |
| `workflow.error`      | `{ errorMessage }`           | Error occurred       |
| `human.input.request` | `{ slideId, prompt }`        | Feedback requested   |
