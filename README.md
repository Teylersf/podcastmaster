# 🎙️ Free Podcast Mastering - Open Source Podcast Audio Mastering Tool

<p align="center">
  <strong>Free AI-powered podcast mastering. Professional broadcast quality in minutes. No signup required. 100% open source.</strong>
</p>

<p align="center">
  <a href="https://freepodcastmastering.com">
    <img src="https://img.shields.io/badge/Live%20Site-freepodcastmastering.com-orange?style=for-the-badge&logo=vercel" alt="Live Site">
  </a>
  <a href="https://github.com/Teylersf/podcastmaster">
    <img src="https://img.shields.io/badge/Open%20Source-100%25-green?style=for-the-badge&logo=github" alt="Open Source">
  </a>
  <img src="https://img.shields.io/badge/Built%20with-Next.js%2016-black?style=for-the-badge&logo=next.js" alt="Next.js 16">
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
</p>

---

## 📋 Table of Contents

- [What is Free Podcast Mastering?](#what-is-free-podcast-mastering)
- [Key Features](#key-features)
- [Privacy & Security](#privacy--security)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 What is Free Podcast Mastering?

**Free Podcast Mastering** is a 100% free, open-source podcast audio mastering tool that helps podcasters achieve professional broadcast-quality audio without expensive software or technical expertise.

Built by podcasters, for podcasters — because we believe everyone deserves access to professional audio tools regardless of budget.

### 🌐 Live Site

**[https://freepodcastmastering.com](https://freepodcastmastering.com)**

---

## ✨ Key Features

### 🎙️ **Free AI Podcast Mastering**
- Upload any podcast audio file (WAV, MP3, FLAC, M4A)
- AI-powered voice optimization using professional mastering techniques
- Broadcast-ready output meeting Spotify, Apple Podcasts & YouTube standards
- No watermarks, no quality limits on free tier

### 🎬 **Free Video Generation**
- Turn mastered audio into stunning videos for YouTube, TikTok, Instagram
- AI-powered caption generation
- 5 visualization templates (waveform, audiogram, bars, particles, pulse)
- 60fps export quality
- YouTube (16:9) and Shorts (9:16) aspect ratios

### 🔒 **Privacy First**
- **Files deleted within 24 hours** (honestly, we just don't want to pay for storage)
- **Zero AI training** — your audio is never used to train models
- **No voice cloning** — your voice belongs to you
- **Open source** — verify our privacy claims by reading the code

### 💳 **Flexible Pricing**
| Feature | Free | Unlimited ($10/mo) |
|---------|------|-------------------|
| Files per week | 2 | Unlimited |
| Output quality | 16-bit | 24-bit HQ |
| Cloud storage | ❌ | 5GB |
| File retention | 24 hours | Permanent |
| Video generation | ✅ | ✅ |

### 🎨 **20+ Themes**
Glassmorphism, Dark, Light, Pretty Pink, Blue Ocean, Green Ocean, Purple Galaxy, Matrix, 90s, 80s, and more!

---

## 🔐 Privacy & Security

### Your Audio is 100% Private

We take privacy seriously:

- ✅ **No AI training** — We never train AI models on your audio
- ✅ **No voice cloning** — Your voice is never used for any AI purposes
- ✅ **24-hour deletion** — All files automatically deleted after 24 hours (free tier)
- ✅ **Zero data selling** — We don't sell, share, or use your data for any purpose beyond processing
- ✅ **Open source** — Verify all claims by reading the code
- ✅ **No backup copies** — Once deleted, files are gone forever

> 💡 **Why open source?** We believe you should be able to verify our privacy claims. All code is publicly available for audit.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** [Next.js 16](https://nextjs.org/) with App Router
- **Language:** [TypeScript 5](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components:** [Radix UI](https://www.radix-ui.com/) primitives
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Icons:** [Lucide React](https://lucide.dev/)

### Authentication & Backend
- **Auth:** [Stackframe Stack](https://stackframe.dev/) — Modern auth for Next.js
- **Database:** [Prisma](https://www.prisma.io/) + PostgreSQL
- **Storage:** [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
- **Payments:** [Stripe](https://stripe.com/)

### Video Generation
- **Engine:** [Remotion](https://www.remotion.dev/) — React video rendering
- **Preview:** Remotion Player for real-time preview
- **Export:** Server-side rendering for high-quality output

### Audio Processing
- **API:** Python FastAPI backend (separate repository)
- **Processing:** AI-powered audio mastering pipeline
- **Storage:** Cloudflare R2 for temporary file storage

### Analytics & Monitoring
- **Analytics:** [Vercel Analytics](https://vercel.com/analytics)
- **Error Tracking:** Built-in Next.js error handling

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 16 Frontend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Home Page  │  │   Dashboard  │  │   Video Generator    │  │
│  │  (Mastering) │  │  (File Mgmt) │  │   (Remotion Player)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        API Routes (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │    Stripe    │  │    Files     │  │   Notifications      │  │
│  │   Webhooks   │  │    CRUD      │  │   (Resend Email)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     External Services                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ FastAPI      │  │  Cloudflare  │  │     Vercel Blob      │  │
│  │ (Audio       │  │     R2       │  │  (Subscriber Files)  │  │
│  │  Processing) │  │(Temp Storage)│  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- A Stripe account (for payments)
- A Stackframe account (for authentication)
- A Vercel account (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Teylersf/podcastmaster.git
   cd podcastmaster
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/podcastmaster"
   
   # Authentication (Stackframe)
   NEXT_PUBLIC_STACK_PROJECT_ID="your-stack-project-id"
   STACK_SECRET_SERVER_KEY="your-stack-secret-key"
   
   # Stripe
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   STRIPE_PRICE_ID="price_..."
   
   # Vercel Blob (for file storage)
   BLOB_READ_WRITE_TOKEN="vercel_blob_token"
   
   # Email (Resend)
   RESEND_API_KEY="re_..."
   
   # Audio Processing API
   NEXT_PUBLIC_API_URL="https://your-audio-api.com"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

---

## 📦 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Teylersf/podcastmaster)

1. Push your code to GitHub
2. Import your repository on Vercel
3. Add your environment variables
4. Deploy!

### Environment Variables for Production

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL database URL | ✅ |
| `NEXT_PUBLIC_STACK_PROJECT_ID` | Stackframe project ID | ✅ |
| `STACK_SECRET_SERVER_KEY` | Stackframe secret key | ✅ |
| `STRIPE_SECRET_KEY` | Stripe secret key | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | ✅ |
| `STRIPE_PRICE_ID` | Stripe price ID for subscriptions | ✅ |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token | ✅ |
| `RESEND_API_KEY` | Resend API key for emails | ✅ |
| `NEXT_PUBLIC_API_URL` | Audio processing API URL | ✅ |

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Ways to Contribute

- 🐛 **Report bugs** — Open an issue with reproduction steps
- 💡 **Suggest features** — Open an issue with your idea
- 📝 **Improve documentation** — Submit a PR with documentation improvements
- 🎨 **Add themes** — Submit new theme designs
- 🔧 **Fix bugs** — Submit PRs for open issues

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run test` (if available)
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- We use ESLint for code linting
- Follow the existing code style
- Write meaningful commit messages
- Add comments for complex logic

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

- [Next.js](https://github.com/vercel/next.js/blob/canary/license.md) — MIT
- [Remotion](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) — MIT
- [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE) — MIT

---

## 🙏 Acknowledgments

- **Average On Purpose Podcast** — For exclusively using and promoting our tool
- **The Podcast Community** — For feedback and feature suggestions
- **Open Source Contributors** — For making this project possible

---

## 📞 Contact & Support

- 🌐 **Website:** [https://freepodcastmastering.com](https://freepodcastmastering.com)
- 📧 **Email:** support@freepodcastmastering.com
- 🐦 **Twitter:** [@freepodcastmaster](https://twitter.com/freepodcastmaster)
- 💬 **GitHub Discussions:** [Join the conversation](https://github.com/Teylersf/podcastmaster/discussions)

---

## 🔗 Related Projects

- [Remotion](https://www.remotion.dev/) — React video rendering
- [Stackframe](https://stackframe.dev/) — Auth for Next.js
- [Prisma](https://www.prisma.io/) — Next-generation ORM

---

<p align="center">
  <strong>Built for the good of humanity 🌍</strong>
  <br>
  Professional podcast mastering should be free for everyone.
</p>

<p align="center">
  Made with ❤️ by podcasters, for podcasters
</p>
