# LUMEN Smart City Civic Infrastructure CV Platform

LUMEN is an enterprise-grade, high-performance AI Computer Vision service designed to detect civic infrastructure issues from citizen-uploaded images. This module is built using Python, FastAPI, Ultralytics YOLO11, PyTorch, OpenCV, and Pillow, and is decoupled from standard NestJS backends and mobile apps to follow clean microservice architectures.

The platform provides a production-ready API and command-line scripts to detect the following civic classes:
* `pothole`
* `garbage`
* `water_leak`
* `broken_streetlight`
* `drainage_issue`
* `fallen_tree`

In addition, a dedicated Road Damage Detection (RDD2022) model provides predictions for:
* `Longitudinal`
* `Transverse`
* `Alligator`
* `Pothole`

---

## Project Structure

```
ai-service/
├── app.py                  # FastAPI app entrypoint
├── train.py                # Command-line training pipeline script
├── predict.py              # Command-line batch/single inference utility script
├── requirements.txt        # Production & development dependencies
├── README.md               # Extensive developer guide & installation documentation
├── .gitignore              # Git ignore rules excluding datasets, caches, envs
├── config.py               # Centralized configuration using Pydantic Settings
├── lumen_ai_colab.ipynb    # Google Colab production training notebook
│
├── models/
│      └── (best.pt / last.pt)   # Custom trained weights directory
│
├── dataset/
│      ├── images/
│      │     ├── train/     # Training images directory
│      │     └── val/       # Validation images directory
│      ├── labels/
│      │     ├── train/     # YOLO label txt files (one file per image)
│      │     └── val/       # YOLO label txt files (one file per image)
│      └── data.yaml        # Dataset configuration pointing to paths and class mapping
│
├── services/
│      ├── detector.py      # Core YOLO model management and inference class
│      ├── predictor.py     # Higher-level prediction workflow
│      └── trainer.py       # YOLO model training, metrics, and weight checkpoints copier
│
├── routes/
│      └── detection.py     # FastAPI router endpoints: /detect, /health, /classes, /model-info
│
├── utils/
│      └── image_utils.py   # Helper functions for validation, resizing, and bbox drawing
│
└── tests/
       ├── test_routes.py   # FastAPI HTTP endpoint tests
       └── test_services.py # Unit tests for services and utils
```

---

## Google Colab & Google Drive Training Workflow

For faster training and stable resource allocation, you can run training on **Google Colab** using GPU accelerators (Tesla T4, L4, A100, etc.) with persistent state tracking in **Google Drive**.

### Training Architecture Diagram

```
Local Laptop (Git Push) ──> GitHub Repository ──> Google Colab VM (GPU)
                                                         │
       Google Drive <────────────────────────────────────┘ (Auto-syncs weights, logs & plots)
```

---

### 1. Git Repository Setup (Laptop to GitHub)

Follow these steps to upload your project codebase to GitHub. **Note:** The dataset (`dataset/`), local runs (`runs/`), virtual environments (`venv/`), and model weights (`*.pt`) are explicitly ignored by [.gitignore](file:///d:/Ai-Service/Lumen-ai/.gitignore) to keep the repository lightweight.

```bash
# 1. Initialize git in the project root
git init

# 2. Add files (excludes dataset/ and runs/ folders automatically)
git add .

# 3. Create initial commit
git commit -m "Initial commit: Production-grade YOLO11 training pipeline with Colab support"

# 4. Link repository to remote origin
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git

# 5. Push codebase to the main branch
git push -u origin main
```

---

### 2. Google Drive Folder Structure

Create a directory named `LUMEN` in your Google Drive root. The folder structure should match the following:

```
MyDrive/
└── LUMEN/
    ├── dataset/
    │   ├── images/
    │   │   ├── train/     # Upload your training JPG images here
    │   │   └── val/       # Upload your validation JPG images here
    │   ├── labels/
    │   │   ├── train/     # Upload your training annotation txt files here
    │   │   └── val/       # Upload your validation annotation txt files here
    │   └── data.yaml      # Configuration yaml pointing to classes
    └── checkpoints/
        ├── best.pt        # (Auto-synced) Best training checkpoint weight
        ├── last.pt        # (Auto-synced) Last training epoch checkpoint weight
        ├── train.log      # (Auto-synced) Training progress text logs
        ├── results.png    # (Auto-synced) Results plots and loss curves
        ├── confusion_matrix.png # (Auto-synced) Validation confusion matrix
        └── metrics.csv    # (Auto-synced) Consolidated training statistics
```

---

### 3. Training on Google Colab

1. Open Google Colab: [colab.research.google.com](https://colab.research.google.com/)
2. Upload the notebook [lumen_ai_colab.ipynb](file:///d:/Ai-Service/Lumen-ai/lumen_ai_colab.ipynb) located in the project root.
3. Configure the Colab Runtime: **Runtime -> Change runtime type** and select a GPU hardware accelerator (T4 GPU, L4 GPU, or A100 GPU).
4. In Step 2 of the notebook, update the GITHUB configuration constants with your repo name and credentials.
5. Run all cells sequentially. The notebook will automatically:
   - Mount Google Drive.
   - Clone/Pull project code.
   - Set up the environment and verify the active GPU.
   - Copy the dataset to the local VM (faster IO operations).
   - Adjust `data.yaml` path config.
   - Start training and sync progress back to Google Drive checkpoints folder.

---

### 4. Auto-Resume after Disconnection

Google Colab instances may occasionally terminate or disconnect due to timeout limits:
1. When you reconnect the notebook, simply run the cells in order.
2. The notebook checks if `MyDrive/LUMEN/checkpoints/last.pt` exists.
3. If found, it automatically restores the weights to the local VM directory and passes the `--resume` flag to `train.py`.
4. Training resumes from the exact epoch it left off, avoiding loss of progress.

---

### 5. Deploying the Model in FastAPI

Once training is complete, download `best.pt` from your Google Drive folder (`LUMEN/checkpoints/best.pt`) and copy it to the local project folder under `models/best.pt` to load it in the FastAPI application.

---

## Local Setup and Installation

### Create Virtual Environment

Initialize a Python 3.10+ virtual environment in the project root:

```bash
# Windows
python -m venv venv

# macOS / Linux
python3 -m venv venv
```

### Activate Virtual Environment

```bash
# Windows (Command Prompt)
venv\Scripts\activate.bat

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# macOS / Linux (Terminal)
source venv/bin/activate
```

### Install Dependencies

Upgrade pip and install the platform dependencies listed in `requirements.txt`:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

## Local Inference and Predictions

Test the model predictions locally without booting up the server:

```bash
# Run prediction on a single local image
python predict.py --source my_test_pothole.jpg --weights models/best.pt

# Run prediction on a folder of local images
python predict.py --source dataset/images/val --weights models/best.pt
```

Outputs will be saved under the `runs/predict/` folder.

---

## Starting the FastAPI Server

Boot the FastAPI application server locally using Uvicorn:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

* Swagger interactive documentation will be exposed at: `http://localhost:8000/docs`
* ReDoc styled documentation will be exposed at: `http://localhost:8000/redoc`

---

## HTTP API Documentation

### POST `/detect`
Accepts an image upload and returns a list of identified objects with confidence levels and bounding boxes.

* **Content-Type**: `multipart/form-data`
* **Request Body**:
  * `file`: Binary image file (JPEG, PNG, WEBP, up to 10MB)

#### Curl Example
```bash
curl -X 'POST' \
  'http://localhost:8000/detect' \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@pothole_example.jpg;type=image/jpeg'
```

#### JSON Response (200 OK)
```json
{
  "success": true,
  "filename": "pothole_example.jpg",
  "detections": [
    {
      "category": "pothole",
      "confidence": 0.9824,
      "bbox": [
        120.4,
        150.2,
        420.1,
        500.5
      ]
    }
  ]
}
```

---

### GET `/health`
Returns the operational health state of the service.

---

### GET `/classes`
Returns the list of classes supported by the active model.

---

### POST `/api/v1/detection/road-damage`
Dedicated API for the Road Damage (RDD2022) model.

* **Content-Type**: `multipart/form-data`
* **Request Body**:
  * `image`: Binary image file (JPEG, PNG, WEBP, up to 10MB)

---

### GET `/api/v1/detection/health/model`
Returns the operational health state of the RDD model.

---

### GET `/model-info`
Returns current model training parameters and weights configuration settings.

---

## Run Unit and Integration Tests

Run the test suite using pytest to verify predictions, endpoints, and validation logic:

```bash
.\venv\Scripts\python -m pytest tests/test_services.py
```
