"""
ml/preprocess.py  —  SignBridge dataset preprocessor

USAGE:
    python ml/preprocess.py --dataset ml/dataset.json

OUTPUTS (all written to ml/):
    X_train.npy        (N_train, 50, 11)  — normalised feature windows
    X_val.npy          (N_val,   50, 11)
    y_train.npy        (N_train,)          — integer class labels
    y_val.npy          (N_val,)
    scaler.pkl                             — MinMaxScaler, needed at inference
    label_encoder.pkl                      — LabelEncoder, needed at inference
    class_report.txt                       — per-class sample counts
"""

import argparse, json, os, pickle, sys
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing   import LabelEncoder, MinMaxScaler

WINDOW   = 50
N_FEATS  = 11
VAL_SIZE = 0.20
SEED     = 42
OUT_DIR  = os.path.dirname(os.path.abspath(__file__))


def extract_features(sample):
    flex = sample.get("flex", {})
    mpu  = sample.get("mpu",  {})
    return [
        float(flex.get("f1", 0)), float(flex.get("f2", 0)),
        float(flex.get("f3", 0)), float(flex.get("f4", 0)),
        float(flex.get("f5", 0)),
        float(mpu.get("accelX", 0)), float(mpu.get("accelY", 0)),
        float(mpu.get("accelZ", 9.81)),
        float(mpu.get("gyroX",  0)), float(mpu.get("gyroY",  0)),
        float(mpu.get("gyroZ",  0)),
    ]


def pad_or_truncate(frames, window):
    arr = np.array(frames, dtype=np.float32)
    if arr.shape[0] >= window:
        return arr[:window]
    pad = np.zeros((window - arr.shape[0], N_FEATS), dtype=np.float32)
    return np.vstack([arr, pad])


def main(dataset_path):
    print(f"Loading: {dataset_path}")
    with open(dataset_path) as f:
        data = json.load(f)

    records = data.get("records", data)
    print(f"Total records: {len(records)}")

    X_raw, y_raw, skipped = [], [], 0
    for rec in records:
        samples = rec.get("samples", [])
        label   = (rec.get("word") or rec.get("gesture", "")).strip().upper()
        if not label or not samples:
            skipped += 1; continue
        frames = [extract_features(s) for s in samples]
        X_raw.append(pad_or_truncate(frames, WINDOW))
        y_raw.append(label)

    print(f"Usable: {len(X_raw)}  |  Skipped: {skipped}")
    if not X_raw:
        print("ERROR: No usable records."); sys.exit(1)

    X = np.stack(X_raw)
    y = np.array(y_raw)

    unique, counts = np.unique(y, return_counts=True)
    print("\nGesture distribution:")
    for g, c in sorted(zip(unique, counts), key=lambda x: -x[1]):
        print(f"  {g:<20} {c:>4}  {'|' * min(c, 40)}")

    le    = LabelEncoder()
    y_enc = le.fit_transform(y)

    min_count = min(counts)
    strat = y_enc if min_count >= 2 else None
    X_train_raw, X_val_raw, y_train, y_val = train_test_split(
        X, y_enc, test_size=VAL_SIZE, random_state=SEED, stratify=strat
    )

    N_tr, N_v = X_train_raw.shape[0], X_val_raw.shape[0]
    scaler = MinMaxScaler()
    scaler.fit(X_train_raw.reshape(N_tr * WINDOW, N_FEATS))

    X_train = scaler.transform(X_train_raw.reshape(N_tr * WINDOW, N_FEATS)).reshape(N_tr, WINDOW, N_FEATS).astype(np.float32)
    X_val   = scaler.transform(X_val_raw.reshape(N_v  * WINDOW, N_FEATS)).reshape(N_v,  WINDOW, N_FEATS).astype(np.float32)

    np.save(os.path.join(OUT_DIR, "X_train.npy"), X_train)
    np.save(os.path.join(OUT_DIR, "X_val.npy"),   X_val)
    np.save(os.path.join(OUT_DIR, "y_train.npy"), y_train)
    np.save(os.path.join(OUT_DIR, "y_val.npy"),   y_val)
    with open(os.path.join(OUT_DIR, "scaler.pkl"),        "wb") as f: pickle.dump(scaler, f)
    with open(os.path.join(OUT_DIR, "label_encoder.pkl"), "wb") as f: pickle.dump(le,     f)

    with open(os.path.join(OUT_DIR, "class_report.txt"), "w") as f:
        f.write(f"Window={WINDOW}  Features={N_FEATS}  Total={len(X_raw)}  Train={N_tr}  Val={N_v}\n\n")
        for g, c in sorted(zip(unique, counts), key=lambda x: -x[1]):
            f.write(f"{g:<20} {c}\n")

    print(f"\nDone -> {OUT_DIR}")
    print(f"  X_train={X_train.shape}  X_val={X_val.shape}")
    print(f"  Classes: {list(le.classes_)}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="ml/dataset.json")
    args = ap.parse_args()
    if not os.path.exists(args.dataset):
        print(f"ERROR: {args.dataset} not found."); sys.exit(1)
    main(args.dataset)
