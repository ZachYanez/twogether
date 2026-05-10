# Twogether

Twogether is an iOS-focused app for couples who want to schedule and protect shared phone-free time.

The product combines relationship-oriented scheduling with a native Screen Time boundary layer, pairing flows, and subscription-ready mobile infrastructure.

## Highlights

- Couples-focused onboarding and pairing flows
- Shared session scheduling and history views
- Native Screen Time / Family Controls integration boundary for iOS
- Subscription infrastructure through RevenueCat
- Auth-ready architecture with app-owned and provider-based entry points

## Tech Stack

- Expo
- React Native
- TypeScript
- Expo Router
- Zustand
- TanStack Query
- RevenueCat
- Supabase
- Swift native module support

## Repository Structure

- `app/` - Expo Router screens
- `src/` - shared UI, state, and client logic
- `modules/expo-twogether-shield/` - local Expo module for Screen Time APIs
- `plugins/withTwogetherIOS.ts` - custom iOS config plugin
- `server/` - local auth server used during development

## Local Development

Use Node 20.19.4 or newer.

```bash
npm install
npm run start
```

For the iOS development build flow:

```bash
npm run prebuild:ios
npm run ios
```

If you are also running the development auth server:

```bash
cd server
npm install
npm run dev
```

## Environment Notes

This app expects local configuration for Supabase, RevenueCat, auth, and provider sign-in values. Keep all credentials and project-specific values in environment files only.

## Product Focus

Twogether is built around one specific outcome: helping couples create protected time together with less distraction and more consistency.
