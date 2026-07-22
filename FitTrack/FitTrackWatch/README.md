# FitTrack Watch companion

Watch app sources live in `FitTrackWatch/`.

## Add the target in Xcode (one-time)

1. Open `FitTrack.xcodeproj`
2. **File → New → Target… → watchOS → App**
3. Product Name: `FitTrackWatch`, embed in FitTrack, include complication optional
4. Replace the generated Swift files with `FitTrackWatch/FitTrackWatchApp.swift`
5. Set bundle id: `com.brandonperalta.fittrack.watchkitapp`
6. Enable **App Groups**: `group.com.brandonperalta.fittrack`
7. Set Info.plist to `FitTrackWatch/Info.plist` (or copy keys)

## What it does

- Shows the active exercise / set from the phone via WatchConnectivity
- **LOG SET** on the Watch tells the phone to complete the current set
- Rest countdown mirrors the phone rest timer

Until the target is added, phone → Watch messages still update the **iOS widget** live workout fields.
