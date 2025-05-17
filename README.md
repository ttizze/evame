# Evame

[日本語版はこちら](README.ja.md)

## Overview

Evame is an open-source project aimed at facilitating knowledge and cultural exchange by providing translations, footnotes, and explanations for user-submitted texts in a beautiful layout.

The goal of this project is to open doors to stories and knowledge for people around the world.

## Current Features

- Article submission
- Translation using Large Language Models (LLMs)
- Saving translation results
- Voting on translation results
- User-submitted translations
- Reader mode

## Features in Development

- Improved readable layout: Better positioning of parallel translations
- Addition of footnotes (planning stage)
- Highlighting feature (planning stage)
- Multi-format support: HTML, PDF, EPUB, plain text (planning stage)
- Chrome extension (planning stage)
- Integration of advanced natural language processing features (planning stage)
  - Extracting important parts from text and searching for translations from dictionaries, etc.

## System Architecture

- React (Remix SSR mode)
- Translation engine: Gemini (currently used exclusively due to its context length advantage)

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
   ```
   Run the following command:
   ```
   openssl rand -base64 32
   ```
   Set the generated string as `SESSION_SECRET` in the `.env` file.

4. Start Docker:
   ```
   docker compose up -d
   ```

5. Set up the database:
   ```
   bunx prisma migrate dev
   ```

6. Run the seed:
   ```
   bun run seed
   ```

7. Start the development server:
   ```
   bun run dev
   ```

8. Access Evame at `http://localhost:5173` in your browser.

9. For local development, authentication is simplified:
   - Visit `http://localhost:5173/auth/login` and log in with dev@example.com and devpassword.
   
   Note: This simplified authentication works only in the development environment and is disabled in production. The normal Google authentication flow is used in production.

## How to Contribute

We welcome contributions in all forms, including translation, programming, design, and documentation. We are particularly seeking contributions in the following areas:

- Implementation of multi-format input support (e.g., PDF)
- Features for changing font size and colors

Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Known Limitations

- Output formats are currently limited.
- There are restrictions on processing long texts.

## License

This project is released under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

If you have questions or suggestions, please create an issue or join our project Discord:
https://discord.gg/2JfhZdu9zW

## Let's work together to realize the vision of opening doors to stories and knowledge for people around the world!