/**
 * Canned explanations of how *this* platform works.
 *
 * Rewritten rather than ported. The lumen-platform originals described that
 * project's algorithms in precise detail — a severity formula summing
 * class_weight × √area_ratio × confidence, ResNet-18 image embeddings for
 * duplicate detection, a knapsack budget planner. None of those are what runs
 * here, and an assistant that recites another system's internals with this
 * system's confidence is worse than one that says nothing: every figure it
 * quotes would be unfalsifiable and wrong.
 *
 * Each entry below describes code in this repository. When one changes, this
 * changes with it.
 */

export const EXPLAIN_TEXT: Record<string, string> = {
  severity:
    'Severity is scored 0-5 by the vision service, in postprocess.py, as ' +
    'min(5, mean_confidence × 3 + detections × 0.5). Both how sure the model is ' +
    'and how many separate defects it found in the frame raise it, so one ' +
    'confident pothole and four uncertain cracks can land in the same band. It ' +
    'is computed once when the photograph is analysed and stored on the ' +
    'complaint.',

  priority:
    'Priority is derived after detection, in ai.repository.ts. Complaints of the ' +
    'same class within 30 m are counted: more than two makes it CRITICAL, one or ' +
    'two makes it HIGH. With no coordinates to cluster on it falls back to ' +
    'severity — above 4 is CRITICAL, above 3 is HIGH. The reasoning is that a ' +
    'defect several residents independently report is worth fixing sooner than ' +
    'one nobody else has hit.',

  duplicate:
    'A new report is rejected at intake if an open complaint of the same class ' +
    'already sits within 20 m, measured by great-circle distance in SQL. 20 m is ' +
    'roughly phone GPS error plus the length of a pothole, so it catches three ' +
    'people photographing one crater without merging two defects on opposite ' +
    'sides of a junction. Resolved and closed complaints are excluded, so a ' +
    'pothole that was fixed and has failed again can be reported. Class matching ' +
    'is case-insensitive, because intake stores what the client sent and the ' +
    'detector later overwrites it with its own label.',

  sla: 'Response-time targets come from priority, not category: CRITICAL 4 h, ' +
    'HIGH 12 h, MEDIUM 48 h, LOW 72 h. The clock starts when the complaint is ' +
    'created. Passing the target does not close or reassign anything — it drives ' +
    'escalation only.',

  detection:
    'Detection runs a YOLO model trained on RDD2022, exported to ONNX and served ' +
    'by onnxruntime in a FastAPI container. It emits four road-damage classes: ' +
    'Pothole, Alligator, Transverse and Longitudinal. It detects nothing else — ' +
    'not garbage, manholes, streetlights or waterlogging. The export bakes in ' +
    'non-maximum suppression at a 0.001 confidence floor so that ' +
    'CONFIDENCE_THRESHOLD, currently 0.25, is the only threshold that actually ' +
    'filters anything.',

  material:
    'An engineer records each pothole in metres. Volume is length × width × ' +
    'depth and perimeter is 2 × (length + width); both are computed and stored ' +
    'on write, so a figure that was signed off cannot drift if the formula ' +
    'changes later. Total volume drives a bill of quantities. Per cubic metre on ' +
    'a bituminous road: brick aggregate 0.90 m³, sand 0.30 m³, bitumen 50 kg, ' +
    'water 20 L, additive 2 kg. On concrete, the nominal 1:2:4 (M20) mix: cement ' +
    '320 kg, sand 0.47 m³, coarse aggregate 0.94 m³, water 205 L. Procurement is ' +
    'quantity × (1 + wastage), cement is ordered in 50 kg bags, and cost adds ' +
    'labour at 25% of materials and overhead at 15% on top. The bituminous ' +
    'proportions are estimating assumptions; the concrete figures follow ' +
    'documented government specifications. Dimensions can also be read off the ' +
    'photograph, but that is always labelled ESTIMATED — a single uncalibrated ' +
    'photo carries no true scale, and depth comes from the severity band rather ' +
    'than from measurement.',

  assignment:
    'Engineers are matched to complaints with the Hungarian algorithm ' +
    '(Kuhn-Munkres), which returns the provably minimum-cost assignment across ' +
    'the whole batch at once rather than one at a time. Cost combines travel ' +
    'distance, whether the engineer is skilled in the detected class, current ' +
    'workload and complaint urgency. Assigning greedily is globally worse: an ' +
    'early complaint takes the engineer a later, closer one needed. Applying a ' +
    'proposal sets the complaints to ASSIGNED and writes a timeline entry naming ' +
    'the engineer — this schema stores no engineer column on the complaint, so ' +
    'the timeline is the record.',

  routing:
    'Dispatch assigns a complaint to one of seven departments — Roads, Water, ' +
    'Electricity, Sanitation, Parks, Police or Fire — and sets an SLA deadline ' +
    'from the priority band. It is triggered by a supervisor rather than ' +
    'automatically: nothing in the pipeline dispatches on its own once detection ' +
    'completes.',

  budget:
    'This deployment has no budget planner. It can cost an individual repair ' +
    'from measured geometry — ask about material estimates — but it does not ' +
    'choose which repairs to fund under a fixed budget.',

  storage:
    'Photographs go to MinIO, an S3-compatible object store running in a ' +
    'container beside the database. The browser and the vision service read them ' +
    'over a public /files path served by Caddy; uploads go through the API, ' +
    'which authenticates the user first.',
};

export const EXPLAIN_LABELS: Record<string, string> = {
  severity: 'Severity',
  priority: 'Priority',
  duplicate: 'Duplicate detection',
  sla: 'SLA targets',
  detection: 'Damage detection',
  material: 'Material estimate',
  assignment: 'Engineer assignment',
  routing: 'Department routing',
  budget: 'Budget planning',
  storage: 'Photograph storage',
};
