# FitTrack

Native iOS workout tracking app built with SwiftUI, SwiftData, and HealthKit.

## Open in Xcode

```bash
open FitTrack/FitTrack.xcodeproj
```

Select your iPhone, set your signing team, and press **Run**.

## First launch

1. **Onboarding** — confirm your name and connect Apple Health (optional)
2. **Home** — live steps and today's session
3. **Train** — log sets during an active workout, then complete the session
4. **Health** — heart rate, sleep, and activity from HealthKit
5. **Progress** — streak, session history, PRs, and calendar

## Edit your program

On the **Train** tab, tap **Program** to rename your workout, change exercises, or add new ones. Everything saves automatically.

## HealthKit setup

If health data doesn't load on device:

1. Open the project in Xcode
2. Select the **FitTrack** target → **Signing & Capabilities**
3. Confirm **HealthKit** is enabled (entitlements file is included)
4. On iPhone: **Settings → Health → Data Access → FitTrack** and allow read access

## App icon

Add a 1024×1024 icon in `FitTrack/Assets.xcassets/AppIcon.appiconset` before App Store submission.

## Project structure

```
FitTrack/
  FitTrackApp.swift          App entry + SwiftData container
  ContentView.swift          Tabs, onboarding, workout flow
  Models/                    SwiftData models + seed data
  Services/                  Workout session + HealthKit
  Views/                     All screens
  Components/                Reusable UI
  Theme.swift                Premium design system
```
