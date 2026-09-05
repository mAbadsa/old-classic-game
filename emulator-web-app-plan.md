# Classic Game Emulator Web App - Development Plan

## Project Overview
Build a web-based classic game emulator platform allowing users to play Sega Genesis, Atari, NES, and other classic systems through a modern web interface.

---

## Tech Stack

### Frontend
- **Next.js 14+** (App Router)
  - Server-side rendering for SEO
  - API routes for backend communication
  - Image optimization
  - Static generation for game listings
  
- **React 18+**
  - State management with Zustand or Redux Toolkit
  - UI components with shadcn/ui or Tailwind CSS
  
- **Emulators (WASM)**
  - **Emscripten** (compile C/C++ emulators to WebAssembly)
  - Popular emulators to port:
    - **Mednafen** (multi-system emulator)
    - **Genesis Plus GX** (Sega Genesis)
    - **MAME** (Arcade)
    - **Nestopia** (NES)
    - **Snes9x** (SNES)
    - **Dosbox** (DOS games)

- **Emulation Libraries**
  - **Emulatorjs** (pre-built WASM emulators)
  - **RetroArch** (universal emulation framework)

### Backend
- **NestJS 10+**
  - RESTful API
  - WebSocket for real-time features (multiplayer, saves sync)
  - Authentication (JWT)
  - Database ORM integration
  
- **Node.js 18+**
  - Runtime environment

### Database
- **PostgreSQL** (primary)
  - User accounts & authentication
  - Game library metadata
  - Save game storage
  - User progress & achievements
  
- **Redis** (caching & sessions)
  - Session management
  - Real-time game state caching
  - Leaderboard rankings

### File Storage
- **AWS S3** or **MinIO** (self-hosted)
  - Store ROM files (encrypted)
  - User save files
  - Game covers/screenshots
  
- **Firebase Storage** (alternative for quick setup)

### DevOps & Infrastructure
- **Docker** & **Docker Compose**
- **GitHub Actions** (CI/CD)
- **Nginx** (reverse proxy, static file serving)
- **PM2** (process management)
- **Vercel** or **Railway** (Next.js hosting)
- **Render** or **Railway** (NestJS backend hosting)

### Additional Libraries & Tools
- **TypeScript** (throughout)
- **Prisma ORM** (database modeling)
- **Passport.js** (authentication)
- **Socket.io** (WebSocket, multiplayer)
- **FFmpeg** (game screenshot/recording)
- **Puppeteer** (ROM metadata scraping)
- **TailwindCSS** + **Headless UI** (styling)
- **Zod** or **Joi** (validation)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Next.js + React)                │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Game Launcher  │  │ Emulator UI  │  │ Settings/Saves │  │
│  └────────────────┘  └──────────────┘  └────────────────┘  │
│         │                  │                    │            │
│         └──────────────────┼────────────────────┘            │
│                            │                                  │
│     ┌──────────────────────┼──────────────────────┐          │
│     │    WASM Emulator (Emscripten)              │          │
│     │  - Runs in browser with WebWorker          │          │
│     │  - No server-side emulation needed         │          │
│     └──────────────────────┬──────────────────────┘          │
└────────────────────────────┼──────────────────────────────────┘
                             │ REST/WebSocket
                             │
┌────────────────────────────┼──────────────────────────────────┐
│               NestJS Backend API                               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │ Auth Module  │  │ Game Module  │  │ Saves Module    │    │
│  ├──────────────┤  ├──────────────┤  ├─────────────────┤    │
│  │ JWT Strategy │  │ CRUD Ops     │  │ Save/Load       │    │
│  │ User Service │  │ Metadata DB  │  │ Achievements    │    │
│  └──────────────┘  └──────────────┘  └─────────────────┘    │
│                                                                │
│  ┌──────────────────────┐  ┌────────────────────────┐         │
│  │ Multiplayer/Socket   │  │ File Upload Service    │         │
│  │ - Real-time sync     │  │ - ROM uploads          │         │
│  │ - Leaderboards       │  │ - Save backup          │         │
│  └──────────────────────┘  └────────────────────────┘         │
└────────────────────────────┬──────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼─────┐      ┌──────▼──────┐      ┌─────▼──────┐
   │PostgreSQL│      │    Redis    │      │  S3/MinIO  │
   │(Users    │      │ (Cache,     │      │  (ROMs,    │
   │ Games,   │      │  Sessions)  │      │   Saves)   │
   │ Saves)   │      │             │      │            │
   └──────────┘      └─────────────┘      └────────────┘
```

---

## Key Features by Phase

### Phase 1: MVP (Weeks 1-4)
- [x] User authentication (sign up/login)
- [x] Single emulator (Genesis or NES)
- [x] Game library listing
- [x] Basic game launcher
- [x] Save game to cloud
- [x] Load save state
- [x] Responsive UI

### Phase 2: Expansion (Weeks 5-8)
- [ ] Multi-emulator support (5+ systems)
- [ ] ROM upload functionality (user's own ROMs)
- [ ] Game metadata (covers, descriptions, ratings)
- [ ] Achievements system
- [ ] Search & filtering
- [ ] Save sync across devices
- [ ] Game screenshots/recording

### Phase 3: Social & Advanced (Weeks 9-12)
- [ ] Multiplayer support (2-4 players)
- [ ] Leaderboards & rankings
- [ ] User profiles & game library sharing
- [ ] Game comments & reviews
- [ ] Mobile app (React Native)
- [ ] Offline mode (service workers)

### Phase 4: Optimization (Weeks 13+)
- [ ] Performance tuning
- [ ] Full-text search
- [ ] Admin dashboard
- [ ] Analytics & monitoring
- [ ] Payment integration (premium features)

---

## File Structure

```
project-root/
├── apps/
│   ├── frontend/                    # Next.js app
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── games/
│   │   │   ├── emulator/
│   │   │   ├── dashboard/
│   │   │   └── auth/
│   │   ├── components/
│   │   │   ├── GameLauncher.tsx
│   │   │   ├── EmulatorUI.tsx
│   │   │   ├── GameLibrary.tsx
│   │   │   └── SaveManager.tsx
│   │   ├── hooks/
│   │   │   ├── useEmulator.ts
│   │   │   ├── useAuth.ts
│   │   │   └── useSaves.ts
│   │   ├── store/                  # Zustand or Redux
│   │   │   ├── authStore.ts
│   │   │   ├── gameStore.ts
│   │   │   └── emulatorStore.ts
│   │   ├── public/
│   │   │   └── emulators/          # WASM files
│   │   │       ├── genesis.wasm
│   │   │       ├── nes.wasm
│   │   │       └── js/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── emulator-loader.ts
│   │   │   └── localStorage-utils.ts
│   │   └── package.json
│   │
│   └── backend/                     # NestJS app
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── auth/
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── auth.controller.ts
│       │   │   ├── jwt.strategy.ts
│       │   │   └── dto/
│       │   ├── games/
│       │   │   ├── games.module.ts
│       │   │   ├── games.service.ts
│       │   │   ├── games.controller.ts
│       │   │   └── entities/
│       │   ├── saves/
│       │   │   ├── saves.module.ts
│       │   │   ├── saves.service.ts
│       │   │   ├── saves.controller.ts
│       │   │   └── dto/
│       │   ├── users/
│       │   │   ├── users.module.ts
│       │   │   ├── users.service.ts
│       │   │   └── dto/
│       │   ├── uploads/
│       │   │   ├── uploads.service.ts
│       │   │   └── s3.config.ts
│       │   ├── websocket/          # Multiplayer
│       │   │   ├── game.gateway.ts
│       │   │   └── multiplayer.service.ts
│       │   ├── database/
│       │   │   ├── prisma.service.ts
│       │   │   └── schema.prisma
│       │   └── common/
│       │       ├── decorators/
│       │       ├── filters/
│       │       └── guards/
│       ├── test/
│       ├── prisma/
│       │   └── schema.prisma
│       ├── .env.example
│       └── package.json
│
├── docker-compose.yml
├── .github/
│   └── workflows/
│       ├── frontend.yml
│       └── backend.yml
└── README.md
```

---

## Database Schema (Prisma)

```prisma
// User
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  username    String   @unique
  passwordHash String
  avatar      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  saves       SaveGame[]
  achievements UserAchievement[]
  sessions    Session[]
}

// Game Metadata
model Game {
  id          String   @id @default(cuid())
  title       String
  emulator    String   // "genesis", "nes", "atari", etc
  romPath     String   // S3 path
  cover       String?  // Image URL
  description String?
  releaseYear Int?
  rating      Float?   @default(0)
  tags        String[] // ["action", "platformer"]
  createdAt   DateTime @default(now())
  
  saves       SaveGame[]
}

// Save State
model SaveGame {
  id          String   @id @default(cuid())
  userId      String
  gameId      String
  saveData    Bytes    // Compressed save state
  saveFile    String   // S3 path
  slotNumber  Int
  screenshot  String?  // S3 URL
  playTime    Int      // seconds
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  game        Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  
  @@unique([userId, gameId, slotNumber])
}

// Achievements
model Achievement {
  id          String   @id @default(cuid())
  title       String
  description String
  icon        String
  criteria    String   // JSON: { type: "time", value: 3600 }
}

model UserAchievement {
  id            String   @id @default(cuid())
  userId        String
  achievementId String
  unlockedAt    DateTime @default(now())
  
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Session
model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## Implementation Roadmap

### Week 1-2: Setup & Auth
- [ ] Initialize Next.js & NestJS projects
- [ ] Set up PostgreSQL + Prisma
- [ ] Implement JWT authentication
- [ ] Create login/signup pages
- [ ] User service & database models

### Week 3-4: Emulator Integration
- [ ] Choose & compile first emulator to WASM
- [ ] Create emulator loader component
- [ ] Implement game controls (keyboard, gamepad)
- [ ] Basic save/load functionality
- [ ] S3 integration for ROM storage

### Week 5-6: Game Library
- [ ] Game metadata database
- [ ] Game listing API
- [ ] Search & filtering
- [ ] Cover image management
- [ ] Rating & reviews system

### Week 7-8: Save Management
- [ ] Cloud save synchronization
- [ ] Save slots UI
- [ ] Auto-save functionality
- [ ] Save encryption
- [ ] Cross-device sync

### Week 9-10: Multiplayer (Optional)
- [ ] WebSocket server (Socket.io)
- [ ] Real-time game state sync
- [ ] Network code implementation
- [ ] Latency compensation

### Week 11-12: Polish & Deployment
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Error handling & logging
- [ ] Documentation
- [ ] Docker containerization
- [ ] Deploy to production

---

## Key Implementation Details

### WASM Emulator Loading
```typescript
// Frontend: Load emulator
async function loadEmulator(system: string) {
  const response = await fetch(`/emulators/${system}.js`);
  const script = await response.text();
  eval(script); // Load emscripten glue code
  return window.Module;
}

// Run emulator in Web Worker to avoid blocking UI
const worker = new Worker('emulator-worker.js');
worker.postMessage({ type: 'loadROM', rom: romData });
```

### Backend Save Handling
```typescript
// NestJS: Save game state
@Post('saves')
@UseGuards(JwtAuthGuard)
async createSave(@Body() dto: CreateSaveDto, @Req() req) {
  const saveData = Buffer.from(dto.saveState);
  const encrypted = this.encryptionService.encrypt(saveData);
  
  const url = await this.s3Service.upload(encrypted);
  return this.savesService.create({
    userId: req.user.id,
    gameId: dto.gameId,
    saveFile: url,
    playTime: dto.playTime,
  });
}
```

### WebSocket Multiplayer
```typescript
// NestJS Gateway
@WebSocketGateway()
export class GameGateway {
  @SubscribeMessage('gameState')
  handleGameState(
    @MessageBody() data: GameStateDto,
    @ConnectedSocket() client: Socket
  ) {
    client.broadcast.emit('gameState', data);
  }
}
```

---

## Security Considerations
- **ROM Handling**: Encrypt ROMs in transit & at rest
- **WASM Sandbox**: Emulator runs in isolated Web Worker
- **Authentication**: JWT with refresh tokens
- **Rate Limiting**: Prevent API abuse (save uploads, ROM downloads)
- **HTTPS Only**: Enforce encrypted connections
- **Input Validation**: Sanitize all user inputs (Zod/Joi)
- **Save Verification**: Verify save integrity before loading

---

## Performance Optimization
- **Lazy Load Emulators**: Only download when needed
- **Compress ROMs**: Use ZIP with on-the-fly extraction
- **Cache Game Metadata**: Redis caching with 1-hour TTL
- **WebWorker Emulation**: Prevent UI blocking
- **Service Workers**: Offline ROM caching
- **Image Optimization**: WebP formats for covers
- **CDN for Static Assets**: Cloudflare or AWS CloudFront

---

## Deployment Strategy

### Local Development
```bash
docker-compose up -d  # Starts PostgreSQL, Redis, MinIO
cd apps/backend && npm run start:dev
cd apps/frontend && npm run dev
```

### Production
```dockerfile
# backend.Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install && npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/main.js"]
```

### CI/CD (GitHub Actions)
- Run tests on push
- Build Docker images
- Push to Docker registry
- Deploy to production (Railway, Render, or self-hosted)

---

## Cost Estimation
- **Hosting**: $20-50/month (Next.js + NestJS + DB)
- **S3 Storage**: $0.023/GB/month (ROMs & saves)
- **CDN**: $0.085/GB (if using CloudFront)
- **Domain**: $10-15/year

---

## Alternative Approaches

### Simpler (No Backend):
- Use **Vercel Edge Functions** instead of separate NestJS
- Store saves in browser IndexedDB (sync to GitHub via API)
- Public ROM repository (legal considerations)

### More Complex:
- Use **Colyseus** for multiplayer instead of Socket.io
- Implement **Steam** integration for achievements
- Add **Stripe** for premium features
- Build **Electron desktop app** version

---

## Resources & References

1. **Emulator Projects**:
   - Emulatorjs: https://www.emulatorjs.org/
   - RetroArch: https://retroarch.com/
   - Emscripten: https://emscripten.org/

2. **WASM Emulation Examples**:
   - MAME compiled to WASM
   - Dosbox-x
   - Various NES/SNES emulators on GitHub

3. **Libraries**:
   - Emulatorjs-core (pre-built emulators)
   - Gamepad.js (controller support)
   - JSZip (ROM extraction)

4. **Learning**:
   - RetroArch source code
   - Emulation documentation
   - WebAssembly MDN docs

---

## Next Steps
1. Create repository structure
2. Set up Docker Compose for local development
3. Initialize Next.js & NestJS projects
4. Implement basic authentication
5. Choose and compile first emulator
6. Build game launcher UI
7. Integrate save functionality
8. Deploy MVP
