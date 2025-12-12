# Evame

[日本語版はこちら](README.ja.md)

Evame is an open-source project that helps people share knowledge by providing translations, footnotes and explanations for user-submitted texts. Our goal is to open doors to stories and ideas for everyone.

## Repository Structure

```
/
├── next/                         # Main web application
│   ├── src/                      # Source code
│   ├── drizzle/                   # Drizzle schema and migrations
│   └── public/                   # Static files
└── components/                   # Chrome extension (currently empty)
```

Most development happens inside `next/`. Shared UI components live in `next/src/components/ui`, while feature specific code is under `next/src/features`.

## Tech Stack

- TypeScript
- Shadcn UI (Radix UI)
- Tailwind CSS
- Drizzle ORM with PostgreSQL
- NextAuth for authentication
- next-intl for i18n
- TipTap editor
- LLM based translation services

## Current Features

- Article submission
- LLM powered translation
- Saving and voting on translations
- Reader mode with user translations

## Features in Development

- Improved layout for parallel translations
- Footnotes
- Highlighting
- Multi-format support: HTML, PDF, EPUB, plain text
- Chrome extension
- Advanced NLP features such as dictionary lookups

## Getting Started


1. Clone this repository:
   ```
   git clone https://github.com/ttizze/evame.git
   ```

2. Install dependencies:
   ```
   cd evame
   cd next
   bun i
   ```

3. Create and set up the environment variables file:
   ```

   cp .env.example .env
   openssl rand -base64 32
   ```
   Add the generated string to `.env`.
4. Start Docker:
   ```bash
   docker compose up -d
   ```
5. Run database migrations and seed:
   ```bash
   cd next
   bunx drizzle-kit migrate dev
   bun run seed
   ```
6. Start the development server:
   ```bash
   bun run dev
   ```
7. Open `http://localhost:5173` in your browser.

For local development you can log in at `/auth/login` using `dev@example.com` and `devpassword`. This shortcut is disabled in production.

## Contributing

We welcome contributions of all kinds. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.

## Contact

Questions or suggestions? Open an issue or join our [Discord](https://discord.gg/2JfhZdu9zW).
