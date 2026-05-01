<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run your local Ollama-powered TMA app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/41020dfa-3b13-4d09-80fb-d1192ebf451a

## Run Locally

**Prerequisites:** Node.js and Ollama

1. Install dependencies:
   `npm install`
2. Install Ollama from https://ollama.com/download
3. Pull the local AI model:
   `ollama pull gemma3`
4. Confirm Ollama is running:
   `curl http://localhost:11434/api/tags`
5. Run the app:
   `npm run dev`

The app calls Ollama at `http://localhost:11434/api/generate` and uses `gemma3:latest` by default. To override this, copy `.env.example` to `.env.local` and change `OLLAMA_API_URL` or `OLLAMA_MODEL`.
