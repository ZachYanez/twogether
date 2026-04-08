# Twogether Auth Server

This is a minimal development auth API that matches the client contract used by the Expo app.

## What it does

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/apple`
- `POST /auth/google`
- `POST /auth/logout`
- `POST /auth/password/forgot`
- `PATCH /account/profile`
- `DELETE /account`
- `GET /health`

It uses in-memory storage only. Restarting the server clears users and sessions.

## Run it

1. `cd server`
2. `cp .env.example .env`
3. `npm install`
4. `npm run dev`

Then set `EXPO_PUBLIC_API_URL=http://localhost:4000` in the app `.env` and restart Expo.

## Notes

- Apple and Google routes currently trust the provider payload coming from the app. For production, verify Apple identity tokens and Google ID tokens server-side before issuing Twogether sessions.
- Password reset currently returns an accepted response only. It does not send real email.
