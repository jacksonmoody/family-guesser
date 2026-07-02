# Family Guesser

A mobile-friendly guessing game for the LBI 2026 family reunion. Teams of two share a phone and have 5 minutes to guess the relationships between as many family members as possible. Results verified via LLM.

## Setup

1. Clone the repository
2. Create a .env file with the following variables (see `.env.example` for examples):
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `ADMIN_PASSCODE`
3. Run `npm install` to install the dependencies
4. Run `npm dev` to start the development server
