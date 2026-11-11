
from ultralytics import YOLO

model = YOLO("runs/detect/train-3/weights/best.pt")

results = model.predict(
    "custom_data/image2.png",
    save=True,
    conf=.25    
)