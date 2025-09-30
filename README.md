# SnapChaos – Quickstart

## 1) Install & Run
```bash
npm install
npm run dev
```
Open http://localhost:3000

## 2) How to play
- Host opens on a laptop/TV, clicks **Create Room** (share the code).
- Players join on phones, enter the code + name.
- Host starts **Hot Potato** or **Prompt Showdown**.
- Submit photos before the timer. Vote Best. Reject Lazy.
- Scores update automatically.

## Notes
- Images are in-memory (base64) for MVP.
- For prod, use S3/Supabase for images + Redis/Upstash for rooms.
- Submissions are anonymous & shuffled in reveal.
