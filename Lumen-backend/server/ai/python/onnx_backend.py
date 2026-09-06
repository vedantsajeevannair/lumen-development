"""ONNX Runtime inference, shaped like the ultralytics API it replaces.

torch and ultralytics cost ~615 MB installed and are used for exactly one thing
here: running a YOLO forward pass. onnxruntime does the same in ~60 MB, which
takes the container image under Artifact Registry's free tier, and starts in
about a second rather than the 30+ that importing torch costs on a cold start.

The classes below deliberately mimic the small part of the ultralytics surface
that detector.py and postprocess.py actually touch — `.names`, `.predict()`,
`result.boxes`, `box.cls/.conf/.xyxyn`, `result.orig_shape`. postprocess.py is
therefore untouched, so the severity scoring and damage-class majority vote
behave identically to the torch build rather than merely similarly.

The exported graph has NMS baked in (`nms=True`), so its output is already
filtered detections rather than raw anchors: [1, 300, 6] of
[x1, y1, x2, y2, confidence, class_id] in letterboxed 640x640 pixel space.
"""

import ast
import logging
from typing import Any, Dict, List, Optional

import numpy as np
import onnxruntime as ort

logger = logging.getLogger("uvicorn.error")

# Ultralytics pads letterboxed images with this grey; matching it matters because
# the model was trained on images padded the same way.
_PAD_VALUE = 114


class _Box:
    """One detection, indexable the way ultralytics' Boxes are.

    postprocess.py reads `box.cls[0].item()`, `box.conf[0].item()` and
    `box.xyxyn[0].tolist()`, so each attribute is a numpy array whose first
    element answers those calls.
    """

    __slots__ = ("cls", "conf", "xyxyn")

    def __init__(self, cls_id: int, confidence: float, xyxyn: List[float]):
        self.cls = np.array([cls_id], dtype=np.float32)
        self.conf = np.array([confidence], dtype=np.float32)
        self.xyxyn = np.array([xyxyn], dtype=np.float32)


class _Result:
    """One image's detections. `len(boxes)` and iteration are all that is used."""

    __slots__ = ("boxes", "orig_shape")

    def __init__(self, boxes: List[_Box], orig_shape):
        self.boxes = boxes
        self.orig_shape = orig_shape


def _letterbox(image: np.ndarray, size: int = 640):
    """Resize preserving aspect ratio and pad to a square, as YOLO expects.

    Returns the padded image plus the scale and padding needed to map boxes back
    to original-image coordinates. Squashing to a square instead would distort
    the geometry the model was trained on and quietly degrade accuracy.
    """
    h, w = image.shape[:2]
    scale = min(size / h, size / w)
    new_h, new_w = int(round(h * scale)), int(round(w * scale))

    # cv2 is already a dependency (preprocess.py needs it for video), so use it
    # rather than adding a second image library for one resize.
    import cv2

    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

    canvas = np.full((size, size, 3), _PAD_VALUE, dtype=np.uint8)
    pad_x, pad_y = (size - new_w) // 2, (size - new_h) // 2
    canvas[pad_y : pad_y + new_h, pad_x : pad_x + new_w] = resized
    return canvas, scale, pad_x, pad_y


class OnnxYOLO:
    """Drop-in stand-in for ultralytics.YOLO, backed by onnxruntime."""

    def __init__(self, model_path: str, num_threads: int = 4):
        opts = ort.SessionOptions()
        # Cloud Run gives one vCPU; letting ORT spawn its default thread pool on
        # top of that adds contention rather than throughput.
        opts.intra_op_num_threads = num_threads
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        self.session = ort.InferenceSession(
            model_path, sess_options=opts, providers=["CPUExecutionProvider"]
        )
        self.input_name = self.session.get_inputs()[0].name
        _, _, self.imgsz, _ = self.session.get_inputs()[0].shape

        # Ultralytics writes the class map into the ONNX metadata at export, so
        # the names travel with the weights instead of being duplicated here and
        # drifting the next time the model is retrained.
        meta: Dict[str, str] = self.session.get_modelmeta().custom_metadata_map
        self.names: Dict[int, str] = (
            ast.literal_eval(meta["names"]) if "names" in meta else {}
        )
        if not self.names:
            raise RuntimeError(
                f"'{model_path}' carries no class names in its metadata. Export it "
                "with ultralytics so the names travel with the graph."
            )

    def predict(
        self,
        source: List[np.ndarray],
        conf: float = 0.25,
        verbose: bool = False,  # accepted and ignored, for call-site compatibility
        device: Optional[str] = None,
        **_: Any,
    ) -> List[_Result]:
        if isinstance(source, np.ndarray):
            source = [source]

        results: List[_Result] = []
        for image in source:
            results.append(self._predict_one(image, conf))
        return results

    def _predict_one(self, image: np.ndarray, conf: float) -> _Result:
        orig_h, orig_w = image.shape[:2]
        padded, scale, pad_x, pad_y = _letterbox(image, self.imgsz)

        # BGR (what preprocess.py produces, matching cv2 convention) to RGB, then
        # to normalised float CHW with a batch dimension.
        blob = padded[:, :, ::-1].transpose(2, 0, 1).astype(np.float32) / 255.0
        blob = np.ascontiguousarray(blob)[None]

        raw = self.session.run(None, {self.input_name: blob})[0]  # [1, N, 6]
        detections = raw[0]

        boxes: List[_Box] = []
        for x1, y1, x2, y2, score, cls_id in detections:
            # The NMS graph emits a fixed-length buffer padded with zero-confidence
            # rows, so this both applies the threshold and trims the padding.
            if score < conf:
                continue

            # Undo the letterbox: remove padding, then the resize scale, to get
            # original-image pixels; postprocess.py wants them normalised 0-1.
            bx1 = (x1 - pad_x) / scale
            by1 = (y1 - pad_y) / scale
            bx2 = (x2 - pad_x) / scale
            by2 = (y2 - pad_y) / scale

            boxes.append(
                _Box(
                    int(cls_id),
                    float(score),
                    [
                        float(np.clip(bx1 / orig_w, 0.0, 1.0)),
                        float(np.clip(by1 / orig_h, 0.0, 1.0)),
                        float(np.clip(bx2 / orig_w, 0.0, 1.0)),
                        float(np.clip(by2 / orig_h, 0.0, 1.0)),
                    ],
                )
            )

        return _Result(boxes, (orig_h, orig_w))
