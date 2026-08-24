import os
import logging
from PIL import Image
from utils import logger, TARGET_DATASET_DIR

def validate_yolo_label_file(label_path: str) -> tuple[bool, list[list[float]], int]:
    """
    Validate a single YOLO label file.
    Returns:
        - is_valid: True if at least one valid line is found and no critical syntax errors exist.
        - valid_lines: List of [class_id, x_center, y_center, w, h] for valid annotations.
        - corrupted_count: Number of corrupted lines in the file.
    """
    valid_annotations = []
    corrupted_count = 0
    
    if not os.path.exists(label_path):
        return False, [], 0
        
    try:
        with open(label_path, 'r') as f:
            lines = f.readlines()
    except Exception as e:
        logger.error(f"Failed to read label file {label_path}: {e}")
        return False, [], 1

    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue
            
        parts = line_str.split()
        if len(parts) != 5:
            logger.warning(f"Syntax Error in {label_path}: Expected 5 elements, got {len(parts)} (Line: '{line_str}')")
            corrupted_count += 1
            continue
            
        try:
            class_id = int(parts[0])
            coords = [float(x) for x in parts[1:]]
            
            # Check bounding boxes normalized in [0, 1]
            if all(0.0 <= c <= 1.0 for c in coords):
                valid_annotations.append([class_id] + coords)
            else:
                logger.warning(f"Coordinate Boundary Error in {label_path}: Coordinates must be in [0, 1] (Line: '{line_str}')")
                corrupted_count += 1
        except ValueError:
            logger.warning(f"Type Value Error in {label_path}: Non-numeric data found (Line: '{line_str}')")
            corrupted_count += 1
            
    # File is considered valid if it is empty or has at least one valid annotation and no corruption
    is_valid = corrupted_count == 0
    return is_valid, valid_annotations, corrupted_count

def verify_dataset_integrity(dataset_dir: str) -> tuple[str, list[str]]:
    """
    Verify the final merged dataset splits.
    Checks:
      - Every image has a label file.
      - Every label file has an image.
      - Bounding box coordinates are valid.
      - No duplicate filenames exist.
      - Images are not corrupted.
    """
    logger.info("Conducting final dataset integrity validation...")
    errors = []
    
    splits = [
        ("train", os.path.join(dataset_dir, "images", "train"), os.path.join(dataset_dir, "labels", "train")),
        ("val", os.path.join(dataset_dir, "images", "val"), os.path.join(dataset_dir, "labels", "val"))
    ]
    
    total_images = 0
    total_labels = 0
    total_bboxes = 0
    corrupted_images = 0
    out_of_bounds_boxes = 0
    
    train_images = set()
    val_images = set()
    
    for split_name, img_dir, lbl_dir in splits:
        if not os.path.exists(img_dir) or not os.path.exists(lbl_dir):
            errors.append(f"Split folders missing for {split_name}.")
            continue
            
        img_files = os.listdir(img_dir)
        lbl_files = os.listdir(lbl_dir)
        
        img_set = {os.path.splitext(f)[0]: f for f in img_files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))}
        lbl_set = {os.path.splitext(f)[0]: f for f in lbl_files if f.endswith('.txt')}
        
        total_images += len(img_set)
        total_labels += len(lbl_set)
        
        if split_name == "train":
            train_images.update(img_set.keys())
        else:
            val_images.update(img_set.keys())
            
        # Verify Image -> Label matching
        for base_name, img_file in img_set.items():
            if base_name not in lbl_set:
                errors.append(f"Missing label file in {split_name} for image: {img_file}")
                
            # Corruption check (PIL verify)
            img_path = os.path.join(img_dir, img_file)
            try:
                with Image.open(img_path) as im:
                    im.verify()
            except Exception as e:
                errors.append(f"Corrupted image in {split_name}: {img_path}. Error: {e}")
                corrupted_images += 1
                
        # Verify Label -> Image matching
        for base_name, lbl_file in lbl_set.items():
            if base_name not in img_set:
                errors.append(f"Missing image file in {split_name} for label: {lbl_file}")
                
            # Coordinate range check
            lbl_path = os.path.join(lbl_dir, lbl_file)
            try:
                with open(lbl_path, 'r') as f:
                    for line in f:
                        parts = line.strip().split()
                        if parts:
                            total_bboxes += 1
                            if len(parts) != 5:
                                out_of_bounds_boxes += 1
                                errors.append(f"Invalid bounding box elements in {lbl_file}: '{line.strip()}'")
                                continue
                            coords = [float(x) for x in parts[1:]]
                            if not all(0.0 <= c <= 1.0 for c in coords):
                                out_of_bounds_boxes += 1
                                errors.append(f"Out-of-bounds bounding box in {lbl_file}: '{line.strip()}'")
            except Exception as e:
                errors.append(f"Error checking coordinates in {lbl_path}: {e}")

    # Check duplicate filenames between splits
    duplicates = train_images.intersection(val_images)
    if duplicates:
        errors.append(f"Duplicate image filenames exist across train and validation splits: {duplicates}")
        
    validation_status = "PASS" if not errors else "FAIL"
    
    # Save validation report
    val_report_path = os.path.join(dataset_dir, "validation_report.txt")
    with open(val_report_path, 'w', encoding='utf-8') as f:
        f.write("=== LUMEN Garbage Dataset Validation Report ===\n")
        f.write(f"Validation Status: {validation_status}\n\n")
        f.write(f"Total train images: {len(train_images)}\n")
        f.write(f"Total val images: {len(val_images)}\n")
        f.write(f"Total images: {total_images}\n")
        f.write(f"Total label files: {total_labels}\n")
        f.write(f"Total bounding boxes: {total_bboxes}\n")
        f.write(f"Corrupted images found: {corrupted_images}\n")
        f.write(f"Invalid/Out-of-bounds boxes: {out_of_bounds_boxes}\n\n")
        if errors:
            f.write("Errors & Warnings details:\n")
            for err in errors[:100]:
                f.write(f"- {err}\n")
            if len(errors) > 100:
                f.write(f"... and {len(errors) - 100} more errors.\n")
        else:
            f.write("All integrity checks passed successfully. File pairing and coordinates are 100% valid.\n")
            
    logger.info(f"Validation finished. Status: {validation_status}. Report saved to {val_report_path}")
    return validation_status, errors
