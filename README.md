# Nandan's Gambler

A polished, claymorphic social casino arcade built with React Native, Expo, and TypeScript.

Nandan's Gambler lets players explore casino-inspired games using fictional in-app coins—**with no real-money gambling, deposits, withdrawals, cash-out, cryptocurrency, or financial accounts**.

## Highlights

- Play-money wallet with a starting balance of **10,642 coins**
- Mobile-first claymorphic interface inspired by the supplied design system
- Responsive layouts for iOS and Android
- Onboarding flow with persistent completion state
- Home, Games, Rewards, and Profile navigation
- Searchable and filterable game catalog
- Animated balance changes, game interactions, and win states
- Local persistence for wallet, profile, rewards, and gameplay state
- Haptic feedback for supported interactions

## Games

The arcade is designed around a collection of 22 casino-inspired games, including:

- Blackjack
- Roulette
- Slots / Clay Reels
- Plinko
- Mines
- Dice
- Crash
- Baccarat
- Video Poker
- Limbo
- Keno
- Hi-Lo
- Wheel
- Towers
- Coin Flip
- Diamonds
- Roshambo
- Dragon Tower
- Poker
- Scratch games

## Design

The app uses a playful claymorphic visual language with:

- Soft rounded cards and controls
- Raised and pressed button states
- Pastel gradients and tactile surfaces
- Animated chips, cards, reels, wheels, and game boards
- Baloo 2 for display typography
- Nunito for interface text

Core colors include lavender, purple, blue, pink, mint, yellow, coral, and a soft off-white canvas.

## Tech Stack

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- TypeScript
- React Native Reanimated
- React Native Gesture Handler
- React Native SVG
- Expo Haptics
- AsyncStorage
- Vitest

## Getting Started

### Prerequisites

- Node.js
- npm
- Expo-compatible development environment
- Android Studio for Android development, or Xcode for iOS development

### Install

```bash
npm install
```

### Start the development server

```bash
npx expo start
```

From the Expo CLI, you can open the app in an emulator, simulator, or on a compatible physical device.

### Run on Android

```bash
npm run android
```

### Type-check the project

```bash
npm run typecheck
```

### Run tests

```bash
npm test
```

### Run Expo diagnostics

```bash
npm run doctor
```

## Project Structure

```text
app/         Expo Router screens and navigation
assets/      App icons and visual assets
components/  Reusable UI and game components
data/        Static game and app data
games/       Game engines and game-specific logic
store/       Wallet, profile, rewards, and statistics state
theme/       Colors, typography, spacing, radius, and shadows
tests/       Automated tests
types/       Shared TypeScript types
utils/       Randomness, payout, storage, and haptic helpers
```

## Play-Money Disclaimer

Nandan's Gambler is a fictional social casino experience for entertainment and software development purposes only. All balances and outcomes use virtual coins. The app does not support real-money wagering, deposits, withdrawals, purchases of cash-equivalent currency, or financial transactions.

## License

No license has been specified for this repository yet.
