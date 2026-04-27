"""
ml/train.py  —  SignBridge 1D-CNN trainer

USAGE:
    python ml/train.py [--epochs 50] [--batch 16]

REQUIRES:
    pip install tensorflow scikit-learn numpy matplotlib

OUTPUTS (written to ml/saved_model/):
    model.keras           — best checkpoint
    model_meta.json       — window size, feature order, class names, val accuracy
    eval_report.txt       — classification report
    training_curves.png
    confusion_matrix.png
"""

import argparse, json, os, pickle
import numpy as np

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.metrics import classification_report, confusion_matrix

ML_DIR  = os.path.dirname(os.path.abspath(__file__))
WINDOW  = 50
N_FEATS = 11


def build_model(num_classes):
    inp = keras.Input(shape=(WINDOW, N_FEATS), name="sensor_input")
    x = layers.Conv1D(32,  3, padding="same", activation="relu")(inp)
    x = layers.BatchNormalization()(x)
    x = layers.Conv1D(64,  3, padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Conv1D(128, 3, padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.GlobalAveragePooling1D()(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.3)(x)
    out = layers.Dense(num_classes, activation="softmax")(x)
    return keras.Model(inputs=inp, outputs=out, name="signbridge_cnn")


def plot_history(history, out_dir):
    fig, ax = plt.subplots(1, 2, figsize=(12, 4))
    ax[0].plot(history.history["accuracy"],     label="train")
    ax[0].plot(history.history["val_accuracy"], label="val")
    ax[0].set_title("Accuracy"); ax[0].legend()
    ax[1].plot(history.history["loss"],     label="train")
    ax[1].plot(history.history["val_loss"], label="val")
    ax[1].set_title("Loss"); ax[1].legend()
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "training_curves.png"), dpi=120)
    plt.close()


def plot_confusion(cm, class_names, out_dir):
    fig, ax = plt.subplots(figsize=(max(6, len(class_names)), max(5, len(class_names) - 1)))
    im = ax.imshow(cm, cmap=plt.cm.Blues)
    plt.colorbar(im, ax=ax)
    ax.set(xticks=np.arange(len(class_names)), yticks=np.arange(len(class_names)),
           xticklabels=class_names, yticklabels=class_names,
           ylabel="True", xlabel="Predicted", title="Confusion Matrix (val)")
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right")
    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                    color="white" if cm[i, j] > thresh else "black")
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "confusion_matrix.png"), dpi=120)
    plt.close()


def main(epochs, batch_size):
    out_dir = os.path.join(ML_DIR, "saved_model")
    os.makedirs(out_dir, exist_ok=True)

    # load data
    for f in ["X_train.npy", "X_val.npy", "y_train.npy", "y_val.npy", "label_encoder.pkl"]:
        if not os.path.exists(os.path.join(ML_DIR, f)):
            raise FileNotFoundError(f"Missing ml/{f} — run python ml/preprocess.py first")

    X_train = np.load(os.path.join(ML_DIR, "X_train.npy"))
    X_val   = np.load(os.path.join(ML_DIR, "X_val.npy"))
    y_train = np.load(os.path.join(ML_DIR, "y_train.npy"))
    y_val   = np.load(os.path.join(ML_DIR, "y_val.npy"))
    with open(os.path.join(ML_DIR, "label_encoder.pkl"), "rb") as f:
        le = pickle.load(f)

    class_names = list(le.classes_)
    num_classes = len(class_names)
    print(f"X_train={X_train.shape}  X_val={X_val.shape}  classes={class_names}")

    model = build_model(num_classes)
    model.summary()
    model.compile(optimizer=keras.optimizers.Adam(1e-3),
                  loss="sparse_categorical_crossentropy",
                  metrics=["accuracy"])

    ckpt = os.path.join(out_dir, "model.keras")
    callbacks = [
        keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=15,
                                      restore_best_weights=True, verbose=1),
        keras.callbacks.ModelCheckpoint(ckpt, monitor="val_accuracy",
                                        save_best_only=True, verbose=1),
        keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5,
                                          patience=7, min_lr=1e-6, verbose=1),
    ]

    history = model.fit(X_train, y_train,
                        validation_data=(X_val, y_val),
                        epochs=epochs, batch_size=batch_size,
                        callbacks=callbacks, verbose=1)

    val_loss, val_acc = model.evaluate(X_val, y_val, verbose=0)
    print(f"\nVal accuracy: {val_acc:.4f}  |  Val loss: {val_loss:.4f}")

    y_pred = np.argmax(model.predict(X_val, verbose=0), axis=1)
    report = classification_report(y_val, y_pred, target_names=class_names)
    print(report)
    with open(os.path.join(out_dir, "eval_report.txt"), "w") as f:
        f.write(f"Val accuracy: {val_acc:.4f}\nVal loss: {val_loss:.4f}\n\n{report}")

    plot_history(history, out_dir)
    plot_confusion(confusion_matrix(y_val, y_pred), class_names, out_dir)

    meta = {
        "window": WINDOW, "n_features": N_FEATS,
        "feature_order": ["f1","f2","f3","f4","f5",
                          "accelX","accelY","accelZ","gyroX","gyroY","gyroZ"],
        "classes": class_names,
        "val_accuracy": round(float(val_acc), 4),
    }
    with open(os.path.join(out_dir, "model_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\nAll outputs saved to {out_dir}/")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=50)
    ap.add_argument("--batch",  type=int, default=16)
    args = ap.parse_args()
    main(args.epochs, args.batch)
