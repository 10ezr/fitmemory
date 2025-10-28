# FitMemory - Personal Workout Coach

A single-user conversational workout coach built with Next.js and MongoDB. FitMemory automatically parses workout reports from natural language, tracks your consistency, learns your patterns, and provides personalized coaching advice.

## Features

- **Natural Language Workout Logging**: Just type "did 3x10 squats 80kg today" and it's automatically parsed and stored
- **AI-Powered Coaching**: Powered by Google's Gemini AI for intelligent, contextual responses
- **Pattern Recognition**: Learns your workout patterns, preferred days, equipment, and routine
- **Consistency Tracking**: Daily streaks, weekly averages, and trend analysis
- **Three-Layer Memory System**: Short-term buffer, recent workouts, and long-term semantic memories
- **Offline Capability**: Works with cached responses when AI is unavailable
- **Data Export/Import**: Full data portability with JSON snapshots
- **Automatic Backups**: Timestamped backup generation

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose ODM
- **AI**: Google Gemini Pro for text generation and embeddings
- **Styling**: Tailwind CSS with custom components

## Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud)
- Google AI API key (from [Google AI Studio](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd fitmemory
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fitmemory?retryWrites=true&w=majority
GEMINI_API_KEY=your_gemini_api_key_here
```

3. **Start MongoDB**
```bash
# If using local MongoDB
mongod
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to `http://localhost:3000`

## Usage

### Basic Workout Logging

FitMemory understands natural language workout reports:

- **"Did legs today - 3x10 squats 80kg, 3x8 deadlifts 100kg"**
- **"Ran 5km in 25 minutes this morning"**
- **"Upper body session - bench press, rows, pull-ups"**
- **"20 minutes cardio on treadmill"**

### Conversation Examples

- **"Summarize my week"** - Get weekly workout summary with coaching tips
- **"Create a workout plan for me"** - Generate personalized 4-week program
- **"How am I doing with consistency?"** - Review your streak and patterns
- **"I missed yesterday, what should I do?"** - Get motivational advice

### Admin Functions

- **Export Data**: Download complete JSON backup
- **Import Data**: Restore from JSON backup
- **Create Backup**: Generate timestamped backup file
- **Clear Memory**: Reset long-term memory (keeps workouts and messages)

## Data Models

### Core Collections

- **Users**: Single local user profile
- **Workouts**: Structured workout sessions with exercises
- **Messages**: Complete conversation history
- **Memories**: Long-term semantic memories with embeddings
- **GeminiResponses**: Cached AI responses for offline use
- **AppConfig**: Application configuration and patterns

### Example Documents

**Workout Document:**
```json
{
  "_id": "...",
  "date": "2024-01-15T00:00:00.000Z",
  "name": "legs workout",
  "exercises": [
    {
      "name": "squats",
      "sets": 3,
      "reps": 10,
      "weightKg": 80
    }
  ],
  "notes": "Did legs today - 3x10 squats 80kg"
}
```

**Memory Document:**
```json
{
  "_id": "...",
  "type": "preference",
  "content": "Prefers morning workouts around 7am",
  "embedding": [0.1, -0.2, 0.5, ...],
  "meta": { "confidence": 0.9 }
}
```

## API Endpoints

### Core Routes
- `POST /api/converse` - Main conversation endpoint
- `GET /api/messages` - Get conversation history
- `GET /api/stats` - Get consistency metrics
- `GET /api/patternSummary` - Get workout pattern summary

### Data Management
- `GET /api/export` - Export all data as JSON
- `POST /api/import` - Import data from JSON
- `POST /api/backup` - Create timestamped backup
- `POST /api/clear-memory` - Clear long-term memories

### Workout CRUD
- `GET /api/workouts` - List workouts
- `POST /api/workouts` - Create workout
- `GET /api/workouts/[id]` - Get specific workout
- `PUT /api/workouts/[id]` - Update workout
- `DELETE /api/workouts/[id]` - Delete workout

## Architecture

### Memory System

1. **Short-term Buffer**: Last 10 messages for conversation context
2. **Recent Workouts**: Last 5 workouts for pattern recognition
3. **Long-term Memories**: Semantic memories with embedding-based similarity search

### AI Integration

- **Text Generation**: Contextual responses using conversation history and patterns
- **Embeddings**: Semantic search for relevant memories
- **Action Parsing**: Structured actions for memory management
- **Offline Fallback**: Cached responses when API unavailable

### Pattern Detection

- Usual workout days and times
- Preferred exercises and equipment
- Session length and frequency
- Weekly volume and consistency trends

## Development

### Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
npm test           # Run Jest tests
npm run backup     # Create backup via script
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test workoutParser.test.js

# Run with coverage
npm test -- --coverage
```

### Project Structure

```
fitmemory/
├── app/
│   ├── api/           # Next.js API routes
│   ├── components/    # React components
│   ├── globals.css    # Global styles
│   ├── layout.js      # Root layout
│   └── page.js        # Main page
├── lib/
│   └── database.js    # Database connection
├── models/
│   └── index.js       # Mongoose models
├── services/
│   ├── analyticsService.js
│   ├── geminiService.js
│   ├── memoryService.js
│   └── workoutParser.js
├── scripts/
│   └── backup.js      # Backup script
└── tests/
    └── *.test.js      # Test files
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

### Environment Variables for Production

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/fitmemory
GEMINI_API_KEY=your_production_api_key
NODE_ENV=production
```

### Database Setup

For production, use MongoDB Atlas or another managed MongoDB service. The app automatically creates the required collections and documents.

## Backup & Data Management

### Automated Backups

```bash
# Create backup manually
npm run backup

# Backup via API
curl -X POST http://localhost:3000/api/backup
```

### Data Export/Import

1. Use the admin panel in the UI
2. Or via API:
```bash
# Export
curl http://localhost:3000/api/export > backup.json

# Import
curl -X POST -H "Content-Type: application/json" \
  -d @backup.json http://localhost:3000/api/import
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection**: Ensure MongoDB is running and URI is correct
2. **Gemini API**: Check API key and quota limits
3. **Port Conflicts**: Change PORT in `.env.local` if 3000 is occupied

### Logs

Check console for detailed error messages and database connection status.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and feature requests, please use the GitHub issue tracker.
