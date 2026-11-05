# Video by SLLAB

Video is an iOS app built for college club sport teams to film their games and practices without needing someone behind the camera. It is part of a bigger project ( ADD LINK ) which aims to create an affordable platform to allow clubs to run smoother and be more competitive. In Video, teams can mount a phone on a motorized stand that follows the action using on-device object detection, record now or on a timer, review footage in a local library, and upload it to YouTube as an unlisted video.

## Requirements

- Xcode 26.4
- iOS 26.4 or later
- A physical iPhone with a rear ultra-wide camera (the camera does not run in the simulator)
- Optional: an ESP32-controlled motorized stand for automatic tracking (firmware is not included in this repo; the app records without it)

## Getting Started

1. Clone the repo and open `sllab.xcodeproj`. There are no package dependencies to resolve.
2. Add the detection model, which is gitignored. Export it with [Ultralytics](https://docs.ultralytics.com) (`pip install ultralytics`), then move the result to `project-2/Resources/yolo26s.mlpackage`:

   ```python
   from ultralytics import YOLO

   model = YOLO("yolo26s")
   model.export(format="coreml", nms=True, end2end=False, imgsz=640)
   ```

3. Create `project-2/Services/Secrets.swift`, which is also gitignored, with OAuth2 credentials for the YouTube channel that videos should upload to. The refresh token needs permission to upload to that channel. Never commit real values.

   ```swift
   enum Secrets {
       static let youtubeClientID = "YOUR_CLIENT_ID"
       static let youtubeClientSecret = "YOUR_CLIENT_SECRET"
       static let youtubeRefreshToken = "YOUR_REFRESH_TOKEN"
   }
   ```

4. Select your development team under Signing & Capabilities, set a unique bundle identifier, then build and run on your device.

## Project Structure

```
project-2/
├── App/        App entry point
├── Models/     Data types (video records)
├── Services/   Camera, YOLO frame processing, Bluetooth, video storage, YouTube upload
├── Views/      App screens (camera, library, video player)
├── Helpers/    Camera preview wrapper
└── Resources/  Assets and Core ML models
```

note: in the codebase you may notice that the app is referred to as project-2; this is the working name of Video by SLLAB and is often used interchangeably throughout.

## How It Works

- **Tracking:** a YOLO Core ML model runs on every third camera frame. The app takes the highest-confidence person detection, smooths its horizontal offset from the center of the frame, and sends it to the stand as a motor command. Ball tracking is planned, so this target will change.
- **Hardware:** the app connects to the ESP32 stand over Bluetooth Low Energy and reconnects automatically if the connection drops. The service and characteristic UUIDs in `BluetoothManager.swift` must match the firmware.
- **Storage:** videos and thumbnails are saved in the app's Application Support directory and excluded from iCloud backup. Metadata is stored with SwiftData.
- **Upload:** videos are sent to a single fixed YouTube channel through the YouTube Data API v3 as unlisted, and the link is saved with the video.

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
