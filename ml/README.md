# ml

Training and export for the detection model Film runs on device.

Only scripts and dataset configs are in git. Images, training runs and weights are
ignored because they are large and can be re-created.

## Datasets

Both are CC BY 4.0 from Roboflow Universe. Download each in YOLO format into its folder
so `train/`, `valid/` and `test/` sit next to its `data.yaml`.

| Folder | Classes | Source |
|---|---|---|
| `datasets/soccerdata` | soccer-ball | [soccer-ball-kjoyy v7](https://universe.roboflow.com/t-kefeng-gmail-com/soccer-ball-kjoyy/dataset/7) |
| `datasets/players` | ball, goalkeeper, player, referee | [football-players-detection v20](https://universe.roboflow.com/roboflow-jvuqo/football-players-detection-3zvbc/dataset/20) |

## Scripts

```sh
pip install ultralytics
python train.py     # fine-tunes yolo26s on datasets/soccerdata (Apple GPU via mps)
python predict.py   # spot-checks a trained run on an image
python export.py    # exports to Core ML for Film
```

Move the exported `.mlpackage` to `apps/film-ios/project-2/Resources/`.

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
