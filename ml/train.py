from ultralytics import YOLO

model = YOLO("yolo26s.pt")

results = model.train(
    data="datasets/soccerdata/data.yaml", 
    epochs=100,
    imgsz=640,
    device = "mps",
)

