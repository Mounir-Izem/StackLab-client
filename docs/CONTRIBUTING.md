# Contributing to StackLab

## Who I am

I'm Mounir. I've been stacking gold and silver since 2020 and I'm learning to code.

StackLab started because I couldn't find a mobile app that tracked my stack the way I wanted — private, offline-first, built for real stackers, not just a portfolio dashboard. So I decided to build it myself, as a career changer learning React Native.

I'm not a senior developer. I make mistakes. I ask questions. I learn as I go.

This project is open source from day one — not because it's a business strategy, but because the bullion community deserves a good tool, and I can't build it alone.

---

## What kind of help I actually need

**Right now (Phase 0 → Phase 2):**

- **Code review** — I'm learning. If you see something wrong, overly complex, or that could cause problems later, please say so. I'd rather be corrected early than refactor everything later.
- **Architecture feedback** — I've documented the architecture carefully (see `ARCHITECTURE.md`), but I might have missed something. If you see a structural problem, I want to know.
- **Bug reports** — Any bug found during beta is valuable. Even better if you describe what you were doing and what you expected.
- **UX feedback from stackers** — If you actually stack physical metals and something in the app doesn't match how you think, that's the most useful feedback I can get.
- **Documentation corrections** — If something in `/docs` is wrong, unclear, or contradicts something else, open an issue.
- **Environment / config / deployment knowledge** — This is where I struggle the most. If you're experienced with Expo builds, Railway, GitHub Actions, or CI/CD and you see something that could cause problems — please say so.

**Less urgent right now:**

- New features — I need to finish the MVP first.
- Backend contributions — too early, not enough structure yet.

---

## Before you contribute

Read these before writing any code:

- `ARCHITECTURE.md` — how the code is structured and why
- `DATA_MODEL.md` — business rules (these are non-negotiable)
- `ROADMAP.md` — what phase we're in and what's next

If something in the docs seems wrong or unclear — open an issue. I'd rather fix the docs than have the code contradict them.

---

## How to contribute

### Found a bug?

Open an issue. Describe:
- What you were doing
- What you expected
- What happened instead
- Your device and OS if relevant

### Want to fix something?

1. Open an issue first — let's talk before you spend time on it
2. Fork the repo and create a branch: `fix/short-description`
3. Make your change
4. Write or update the relevant test (see `TESTING_STRATEGY.md`)
5. Open a pull request with a clear description

### Want to add a feature?

Open an issue first. Features need to align with the roadmap and product decisions. I might say "not now" — that doesn't mean never.

---

## Code standards

I'm trying to maintain real standards even as a beginner. Please respect:

- TypeScript strict — no `any`, no `@ts-ignore`
- The 4-layer architecture (UI → Store → Service → Repository)
- No SQLite calls in components
- No financial calculations outside `utils/calculations.ts`
- No `console.log()` in committed code
- Tests for any financial logic or business rules

If you're unsure, just ask in the issue or the PR.

---

## License

By contributing, you agree your contribution is licensed under AGPL-3.0.

The assets (skins, sounds, animations) are proprietary and not part of this repo.

---

*Built by a stacker, for stackers. Any help is welcome.*
