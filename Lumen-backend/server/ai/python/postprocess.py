from collections import Counter

def format_single_prediction(result, names) -> dict:
    """
    Format a single YOLO Result object into the output schema.
    """
    if not result or result.boxes is None or len(result.boxes) == 0:
        orig_h, orig_w = result.orig_shape if (result and hasattr(result, "orig_shape")) else (0, 0)
        return {"damageClass": "UNKNOWN", "confidenceScore": 0.0, "severity": 0.0, "boundingBoxes": [], "width": orig_w, "height": orig_h}
        
    boxes = result.boxes
    formatted_boxes = []
    classes = []
    confidences = []
    
    for box in boxes:
        cls_id = int(box.cls[0].item())
        conf = float(box.conf[0].item())
        xyxyn = box.xyxyn[0].tolist()
        
        label = names[cls_id]
        classes.append(label)
        confidences.append(conf)
        
        formatted_boxes.append({
            "label": label,
            "class_name": label,
            "confidence": conf,
            "xmin": xyxyn[0],
            "ymin": xyxyn[1],
            "xmax": xyxyn[2],
            "ymax": xyxyn[3]
        })
        
    # Majority vote for primary damage class
    most_common_class = Counter(classes).most_common(1)[0][0]
    avg_confidence = sum(confidences) / len(confidences)
    
    # Calculate severity based on confidence and number of bounding boxes
    severity = min(5.0, (avg_confidence * 3.0) + (len(boxes) * 0.5))
    orig_h, orig_w = result.orig_shape if hasattr(result, "orig_shape") else (0, 0)
    
    return {
        "damageClass": most_common_class.upper(),
        "confidenceScore": avg_confidence,
        "severity": round(severity, 2),
        "boundingBoxes": formatted_boxes,
        "width": orig_w,
        "height": orig_h
    }

def format_predictions(results, names) -> dict:
    """
    Backwards-compatible formatter for a list of YOLO Results (assumes list length of 1).
    """
    if not results or len(results) == 0:
        return {"damageClass": "UNKNOWN", "confidenceScore": 0.0, "severity": 0.0, "boundingBoxes": [], "width": 0, "height": 0}
    return format_single_prediction(results[0], names)

def merge_video_predictions(frame_predictions: list) -> dict:
    """
    Combines frame predictions into a single summary for a video.
    """
    if not frame_predictions:
        return {"damageClass": "UNKNOWN", "confidenceScore": 0.0, "severity": 0.0, "boundingBoxes": [], "width": 0, "height": 0}
        
    all_classes = []
    all_confidences = []
    
    for pred in frame_predictions:
        if pred["damageClass"] != "UNKNOWN":
            all_classes.append(pred["damageClass"])
            all_confidences.append(pred["confidenceScore"])
            
    if not all_classes:
        return {"damageClass": "UNKNOWN", "confidenceScore": 0.0, "severity": 0.0, "boundingBoxes": [], "width": 0, "height": 0}
        
    # Get overall most common class across all frames
    most_common_class = Counter(all_classes).most_common(1)[0][0]
    avg_confidence = sum(all_confidences) / len(all_confidences)
    
    # Return the most confident frame's bounding boxes
    best_frame = max(frame_predictions, key=lambda x: x["confidenceScore"])
    
    return {
        "damageClass": most_common_class,
        "confidenceScore": avg_confidence,
        "severity": best_frame.get("severity", 0.0),
        "boundingBoxes": best_frame["boundingBoxes"],
        "width": best_frame.get("width", 0),
        "height": best_frame.get("height", 0)
    }
