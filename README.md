# ZenNori (海苔のり) 🍱

[![CI](https://github.com/OfferPk/zennori/actions/workflows/ci.yml/badge.svg)](https://github.com/OfferPk/zennori/actions/workflows/ci.yml)
[![Pages](https://github.com/OfferPk/zennori/actions/workflows/pages.yml/badge.svg)](https://offerpk.github.io/zennori/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20PWA%20%7C%20Android-blue.svg)](https://github.com/OfferPk/zennori)

A serene, contemplative Japanese domino division logic puzzle inspired by the revered Nikoli **Norinori (ノリノリ)** pencil puzzle tradition.

🎮 **[Play Live Demo](https://offerpk.github.io/zennori/)**

---

## 🍵 About Norinori

In traditional Japanese bento presentation, dark seasoned nori seaweed sheets are placed with intention and harmony. In ZenNori, your goal is to balance the bento tray by placing 1×2 nori dominoes across outlined chambers:

1. **Chamber Balance**: Every outlined chamber must contain **exactly two** shaded nori cells.
2. **Domino Rule**: Shaded cells must connect into **1×2 dominoes** (sharing an orthogonal edge). No single shaded cells or polyominoes of 3+ cells are allowed.
3. **No Touching Dominoes**: Dominoes can cross between different chambers, but **no two dominoes may touch orthogonally** (sharing an edge). Diagonal touch is permitted.
4. **Pure Logic**: Every puzzle has a unique, solver-verified solution discoverable through deduction without guessing.

---

## ✨ Features

- **50 Unique Solver-Verified Levels**:
  - 🍱 **Bento • Novice** (6×6, Levels 1–10)
  - 🍙 **Onigiri • Apprentice** (7×7, Levels 11–20)
  - 🍵 **Kaiseki • Journeyman** (8×8, Levels 21–30)
  - 🏮 **Izakaya • Artisan** (9×9, Levels 31–40)
  - ⛩️ **Shokunin • Master** (10×10, Levels 41–50)
- **Fluid Controls**: Click or tap to cycle states (`Empty ➔ Nori ➔ Dot`), or drag/paint across rows and columns.
- **Smart Assistance**:
  - Real-time chamber counter badges (`0/2`, `1/2`, `2/2`).
  - Instant domino violation detection for connected groups > 2 cells.
  - Unlimited Undo history (`Ctrl+Z`).
  - Deductive hint engine explaining the logical next step.
- **Procedural Japanese Audio**: Authentic Web Audio synthesis featuring koto chimes, bamboo click taps, and resonant temple bells (Bonshō).
- **Minimalist Aesthetics**: Crafted Japanese woodwork design with instant Light and Dark mode switching.
- **Cross-Platform**: Zero external runtime dependencies. Runs offline as a standalone PWA or native Android APK.

---

## 📱 Android APK Installation

1. Navigate to the **[Actions tab](https://github.com/OfferPk/zennori/actions/workflows/android.yml)** in this repository.
2. Select the latest completed workflow run from the `main` branch.
3. Under **Artifacts**, download `zennori-apk.zip`.
4. Unzip and install `app-debug.apk` on your Android device (ensure "Install from unknown sources" is enabled).

---

## 🛠️ Local Development & Testing

ZenNori is built with vanilla modern JavaScript and zero build-step overhead:

```bash
# Clone the repository
git clone https://github.com/OfferPk/zennori.git
cd zennori

# Run unit tests (Node.js native test runner)
npm test

# Build distribution assets to www/
npm run build
```

---

## 📜 License

MIT License. Designed and developed with care by [OfferPk](https://github.com/OfferPk).
