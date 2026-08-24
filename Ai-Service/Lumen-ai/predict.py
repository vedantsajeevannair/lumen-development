import argparse
import sys
import os
import json
import logging
from pathlib import Path
import cv2
from services.predictor import PredictorService
from services.detector import ModelNotFoundError
from utils.image_utils import draw_bounding_boxes
from config import settings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("predict_cli")

def main() -> None:
    """CLI utility for running local YOLO11 image predictions."""
    parser = argparse.ArgumentParser(
        description="LUMEN Smart City CV Platform - Prediction CLI Utility",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    parser.add_argument(
        "--source", 
        type=str, 
        required=True, 
        help="Path to an image file or directory containing images to analyze"
    )
    parser.add_argument(
        "--weights", 
        type=str, 
        default=str(settings.MODEL_PATH), 
        help="Custom YOLO weights checkpoint path override"
    )
    parser.add_argument(
        "--conf", 
        type=float, 
        default=settings.CONFIDENCE_THRESHOLD, 
        help="Confidence cutoff threshold for positive class matches"
    )
    parser.add_argument(
        "--save-dir", 
        type=str, 
        default="runs/predict", 
        help="Target folder directory to save drawn visual prediction outputs"
    )
    parser.add_argument(
        "--no-save", 
        action="store_true", 
        help="Flag to disable drawing boxes and saving annotated images to disk"
    )
    
    args = parser.parse_args()
    
    # Override settings dynamically using CLI args
    settings.MODEL_PATH = Path(args.weights)
    settings.CONFIDENCE_THRESHOLD = args.conf
    
    source_path = Path(args.source)
    if not source_path.exists():
        logger.error(f"Input source path does not exist: {source_path}")
        sys.exit(1)
        
    # Gather target image file(s)
    files_to_process = []
    if source_path.is_file():
        files_to_process.append(source_path)
    elif source_path.is_dir():
        # Retrieve all file extensions allowed by our system configurations
        for ext in settings.ALLOWED_EXTENSIONS:
            files_to_process.extend(source_path.glob(f"*{ext}"))
            files_to_process.extend(source_path.glob(f"*{ext.upper()}"))
            
    if not files_to_process:
        logger.error(f"No valid image files found at source: {source_path}")
        sys.exit(1)
        
    logger.info(f"Found {len(files_to_process)} image(s) to process. Initiating analysis...")
    
    # Initialize high-level predictor service
    predictor = PredictorService()
    
    # Create the output visual directory if requested
    save_outputs = not args.no_save
    save_dir = Path(args.save_dir)
    if save_outputs:
        save_dir.mkdir(parents=True, exist_ok=True)
        
    consolidated_results = []
    
    for img_path in files_to_process:
        logger.info(f"Evaluating: {img_path.name}")
        try:
            # Predict
            detections = predictor.predict_image_path(img_path)
            
            # Print console output
            print(f"\n==========================================")
            print(f" Detections for: {img_path}")
            print(f"==========================================")
            if not detections:
                print("No civic issues identified.")
            for det in detections:
                print(f" - Category:   {det['category']}")
                print(f" - Confidence: {det['confidence']:.4f}")
                print(f" - Bounding Box: {det['bbox']}")
                print(f"------------------------------------------")
            
            # Visualize & write annotations
            if save_outputs:
                image = cv2.imread(str(img_path))
                if image is not None:
                    annotated = draw_bounding_boxes(image, detections)
                    out_path = save_dir / f"annotated_{img_path.name}"
                    cv2.imwrite(str(out_path), annotated)
                    logger.info(f"Annotated visualization saved to: {out_path}")
            
            # Track in global consolidated list
            for det in detections:
                consolidated_results.append({
                    "image_path": str(img_path),
                    "category": det["category"],
                    "confidence": det["confidence"],
                    "bbox": det["bbox"]
                })
                
        except ModelNotFoundError as e:
            logger.error(f"Prediction failed because model weights are missing: {e}")
            logger.error("Please run model training first or provide valid weights via the --weights option.")
            sys.exit(1)
        except Exception as e:
            logger.error(f"Unexpected execution error parsing file {img_path.name}: {e}", exc_info=True)
            
    # Write a JSON summary file if batch predictions are processed
    if len(files_to_process) > 1 and save_outputs:
        summary_path = save_dir / "batch_predictions_summary.json"
        with open(summary_path, "w") as f:
            json.dump(consolidated_results, f, indent=2)
        logger.info(f"Consolidated JSON batch results saved to: {summary_path}")

if __name__ == "__main__":
    main()
