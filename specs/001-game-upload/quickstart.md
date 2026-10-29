# Quickstart: Validate Game Upload

Assumes `npm install` at the repo root and Postgres running with `DATABASE_URL` set in `apps/backend/.env`, plus `JWT_SECRET`.

## 1. Run the migration and start the apps

```bash
npm run dev
```

Confirm the `thumbnail` column exists on `games`.

## 2. Create an admin

Sign up through the frontend or `POST /auth/signup`, then set the role to `admin` in the database. Get a token from `POST /auth/login`.

## 3. Upload a game

```bash
curl -X POST http://localhost:3001/games/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F title="Test Game" -F emulator=nes -F description="demo" \
  -F rom=@test.nes -F cover=@cover.png -F thumbnail=@thumb.png
```

Expect 201 with `romPath`, `cover`, and `thumbnail` set.

## 4. Check playback

```bash
curl -L -H "Authorization: Bearer $TOKEN" http://localhost:3001/games/<id>/rom -o out.nes
cmp test.nes out.nes
```

Bytes must match. Then open the game at `/play` in the frontend.

## 5. Check the rejection paths

| Case | Expected |
|------|----------|
| `rom=@bad.exe` | 400 naming `.exe` and the allowed types |
| `emulator=pong` | 400 listing supported systems |
| `thumbnail=@big.png` (> 5 MB) | 400 "must be at most 5 MB" |
| Missing `thumbnail` | 400 "rom, cover and thumbnail files are all required" |
| Non-admin token | 403 |
| No token | 401 |

After each rejected case, confirm no row was added and no new file appeared under `UPLOADS_DIR` (the rollback check).

## 6. Automated checks

```bash
npm run test -w apps/backend
npm run lint -w apps/backend
```
