# ♻️ KRUX: Comprehensive Project Details

This document serves as an in-depth breakdown of **KRUX**, detailing the problem space, our proposed solution, and a deep dive into both the technical and non-technical aspects of the ecosystem.

---

## 🌍 1. Non-Technical Aspects: The Vision & Impact

### 1.1 The Problem Statement
The world produces over 380 million tons of plastic waste annually, yet less than 9% of it is successfully recycled. The primary reasons for this failure are:
1. **Lack of Incentive:** Individuals have no direct financial or social motivation to sort and recycle their waste.
2. **Contamination:** Bins are often contaminated with mixed materials (organic waste mixed with plastics), making the entire batch unrecyclable.
3. **Inefficient Infrastructure:** Traditional bins cannot sort materials at the source, relying instead on highly expensive downstream sorting facilities.

### 1.2 The KRUX Solution
KRUX is a gamified, AI-powered Smart Bin ecosystem that shifts the sorting process to the source (the consumer) while rewarding them for doing it correctly. 
- **For Users:** Recycling becomes a game. Scan a bottle, drop it in the bin, and instantly earn KRUX Coins to spend on sustainable goods.
- **For Waste Management:** Bins are completely free of contamination because the bin autonomously verifies the plastic type before accepting it.

### 1.3 The Gamification Engine
To ensure long-term user retention, KRUX implements a multi-layered gamification system:
- **KRUX Coins:** The core currency. Users earn base coins per scan (e.g., PET = 15 coins, HDPE = 12 coins).
- **Streaks & Freezes:** Users are rewarded for consecutive daily scans. Missing a day breaks the streak, but users can buy "Streak Freezes" with their coins.
- **Global Leaderboard:** Users compete globally based on their "Green Score" and Total XP.
- **Achievements & Badges:** Milestone rewards for hitting specific targets (e.g., "First Scan", "100 Bottles Recycled").
- **Sustainable Marketplace:** Coins aren't just virtual points; they can be redeemed for real-world discounts on eco-friendly brands.

---

## 💻 2. Technical Aspects: The Software

The software layer of KRUX is designed as a **Progressive Web App (PWA)** to ensure cross-platform compatibility (iOS, Android, Web) without forcing users to download a heavy native app.

### 2.1 Tech Stack
- **Frontend Framework:** React 18 with TypeScript.
- **Build Tool:** Vite (for lightning-fast hot module replacement).
- **Styling:** Tailwind CSS (for highly responsive, modern UI design).
- **State Management:** Zustand (for lightweight, global state management like user sessions and coin balances).
- **Icons & UI:** Lucide React for consistent iconography.

### 2.2 Backend & Infrastructure (Firebase)
KRUX utilizes Google's Firebase ecosystem to achieve zero-latency synchronization between the app and the physical bins.
- **Firebase Authentication:** Handles secure user login and session persistence.
- **Cloud Firestore:** A NoSQL database storing user profiles, coin balances, streaks, badges, and historical scan data.
- **Realtime Database (RTDB):** The critical communication bridge between the Web App and the ESP32 Hardware. The hardware writes to the RTDB, and the app listens to it in real-time.

### 2.3 On-Device Machine Learning (Computer Vision)
Instead of sending images to a costly cloud server, KRUX performs plastic classification **directly in the user's browser**.
- **Model:** TensorFlow.js utilizing the MobileNet architecture.
- **Execution:** The webcam feed is captured, converted into an image tensor, and passed through the ML model locally on the phone's GPU/NPU.
- **Privacy:** Since inference happens entirely on-device, no images are ever saved or transmitted to a server, ensuring 100% user privacy and zero server costs.

### 2.4 Advanced Fraud Detection
To prevent users from gaming the system, the app utilizes multi-layered client-side checks:
1. **Speed Limits:** Enforces a minimum cooldown between scans.
2. **Confidence Thresholds:** The ML model must be >60% confident that the item is plastic.
3. **Perceptual Hashing (Simulated):** Prevents users from scanning the exact same bottle twice.
4. **Hardware Verification:** The app does not award coins until the physical IR sensor on the bin confirms a physical object was dropped.

---

## 🤖 3. Technical Aspects: The Hardware

The physical smart bin operates autonomously and acts as the final source of truth for all transactions.

### 3.1 Hardware Components
- **Microcontroller:** ESP32 (chosen for its built-in WiFi and ample processing power).
- **Sensor:** IR (Infrared) Obstacle Sensor (detects when an object physically passes the chute).
- **Actuator:** Standard 180° Servo Motor (mechanically routes the dropped plastic into the correct internal compartment).

### 3.2 The Hardware Pipeline
1. **Idle State:** The ESP32 is connected to the local WiFi network and waits for the IR sensor to be triggered.
2. **Detection:** A user drops a scanned bottle. The IR sensor detects the physical object breaking its beam.
3. **Sorting:** The ESP32 calculates the required servo angle based on the current bin configuration and physically rotates the internal flap to route the plastic.
4. **Database Sync:** The ESP32 constructs a JSON payload (`{"status": "confirmed", "timestamp": ...}`) and fires an `HTTP PUT` request directly to the Firebase Realtime Database at the specific `drop_events/KRUX_BIN_001` node.
5. **Reset:** The servo returns to its neutral position, ready for the next user.

---

## 🔗 4. The Integration (System Handshake)

The magic of KRUX is how the Software and Hardware interact seamlessly without a central server intermediary.

1. **The Handshake:** The user scans the QR code on the physical bin (`KRUX_BIN_001`). The Web App begins listening to the Firebase Realtime Database at the specific node for that bin.
2. **The ML Scan:** The user scans the plastic on their phone. The ML model approves it. The Web App sets a 30-second countdown timer.
3. **The Drop:** The user drops the plastic. The ESP32 detects it and writes to the RTDB.
4. **The Resolution:** The Web App detects the RTDB update instantly, stops the countdown timer, clears the RTDB node, and securely mints the KRUX Coins to the user's Firestore profile.

---
*Documented by the KRUX Engineering Team.*
