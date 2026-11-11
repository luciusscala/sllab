# Film by SLLAB

Film by SLLAB is an iOS app that records games and practices without anyone behind the camera. Mount the phone on SLLAB's [tracking base](../../hardware), and the app detects play on device and turns the base to follow it. Recordings are kept in an in-app library and can be uploaded to YouTube.

It's part of [SLLAB](../../README.md). Commercial auto-tracking systems cost around $2,000; Film and its mount cost about $400 in parts.

> **Status:** working prototype, not yet released. The full loop from camera frame to motor runs end to end, tracking players. A ball detection model is in training in [`ml/`](../../ml).

<!-- MEDIA: the app's camera screen with detection boxes, and the library -->

## Features

- **Automatic tracking.** On-device detection steers the base over Bluetooth, and reconnects if the link drops. The app records normally without the base.
- **Wide field of view.** Records on the rear ultra-wide camera, so more of the field stays in frame.
- **Start now or on a timer.** Timer presets of 30 seconds to 10 minutes give time to set up the mount before recording starts.
- **On-screen controls.** Detection boxes can be shown or hidden. Motor movement can be paused. Performance mode turns off the live preview to reduce the phone's workload while recording.
- **Library.** Videos and thumbnails are stored by the app, not in the camera roll, and are excluded from iCloud backup.
- **YouTube upload.** Uploads a video as unlisted and saves its link with the video. A failed upload can be retried.

## How tracking works

```
camera frame ─▶ YOLO (Core ML) ─▶ pick target ─▶ smooth ─▶ 1 byte over BLE ─▶ ESP32 ─▶ stepper
 every frame     every 3rd frame    best "person"   EMA        −127…127          nudge ≈3.4°
```

1. Frames from the camera are passed to a detection model running through Vision. Only every third frame is processed, which keeps inference within budget while the camera also records.
2. The target is the most confident person detection above 0.4 confidence. Its horizontal offset from the center of the frame is scaled to −1…1.
3. The offset is smoothed with an exponential moving average (70% previous, 30% new), so one noisy detection doesn't swing the camera.
4. The smoothed offset is sent as one signed byte with a Bluetooth write that waits for no acknowledgement. The firmware moves only when the offset is outside its deadzone; see the [hardware README](../../hardware).

When nothing is detected, the smoothing resets, and the base stays still until play is found again.

## Requirements

- Xcode 26.4 and iOS 26.4 or later
- A physical iPhone with a rear ultra-wide camera. The camera does not run in the simulator.
- Optional: the [tracking base](../../hardware)

## Getting started

1. Open `SLLAB.xcworkspace` at the repository root, or `sllab.xcodeproj` here. There are no package dependencies.
2. Add the detection model, which is not stored in git. Either train and export one with [`ml/`](../../ml), or export the base model with [Ultralytics](https://docs.ultralytics.com) (`pip install ultralytics`):

   ```python
   from ultralytics import YOLO

   YOLO("yolo26s").export(format="coreml", nms=True, end2end=False, imgsz=640)
   ```

   Move the result to `project-2/Resources/yolo26s.mlpackage`.

3. Create `project-2/Services/Secrets.swift`, which is also not stored in git, with OAuth credentials for the YouTube channel uploads should go to. Never commit real values.

   ```swift
   enum Secrets {
       static let youtubeClientID = "YOUR_CLIENT_ID"
       static let youtubeClientSecret = "YOUR_CLIENT_SECRET"
       static let youtubeRefreshToken = "YOUR_REFRESH_TOKEN"
   }
   ```

4. Select your development team under **Signing & Capabilities**, set a unique bundle identifier, then build and run on your device.

## Project structure

```
project-2/
├── App/        App entry point
├── Models/     Video records (SwiftData)
├── Services/   Camera, frame processing, Bluetooth, video library, YouTube upload
├── Views/      Camera, library and video player screens
├── Helpers/    Camera preview wrapper
└── Resources/  Assets and Core ML models
```

The source folder is still named `project-2`, the app's working name.

## Before release

- Move upload authorization to the platform's API, so the app holds no channel credentials and each team uploads to its own channel.
- Stream uploads from disk instead of loading the whole file into memory, which full-length matches need.
- Track the ball rather than a single player, once the ball model is ready.
- Link each video to its game in Fixture, through the shared backend.

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
