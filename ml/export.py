from ultralytics import YOLO


model = YOLO("yolo26s") 

# Export the model
model.export(format="coreml", nms=True, end2end = False, imgsz=640)