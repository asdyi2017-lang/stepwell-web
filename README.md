# StepWell: Virtual Health Companion & Clinical Bridge

![StepWell Banner](link-to-your-banner-or-logo.png) StepWell is a comprehensive HealthTech ecosystem designed to bridge the gap between daily fitness tracking and professional clinical monitoring. Built as a dual-role platform, it empowers patients through gamified health tracking and an AI-driven assistant, while providing medical professionals with a robust dashboard for rapid triage and clinical report generation.

---

## Key Features

### For Patient
* **Real-time Health Dashboard:** Track daily steps, calories, and biological markers (Blood Pressure, SpO2, Heart Rate).
* **AI Virtual Companion:** Powered by Google Gemini API, the assistant provides contextual health insights based on real-time weather and biometric data.
* **Gamification & Milestones:** Earn badges for step milestones (10K, 100K, 1M) and maintain daily activity streaks.
* **Hardware Fault Simulation:** Interactive UI to test how the system handles offline sensors or unrealistic data (e.g., 1,000,000 steps).

### For Medical Professionals
* **Patients Directory:** A grid-based clinical dashboard showing high-level statuses (Normal, Warning, Critical) for assigned patients.
* **One-Click Clinical Reports:** Automatically generate and export formatted PDF medical reports utilizing Expo-Print.
* **Data Management:** Ability to manually override or log specific biometric readings directly from the patient's profile.

---

## Technology Stack

* **Frontend:** React Native, Expo, React Navigation, Lucide Icons.
* **Backend:** Node.js, Express.js (Hosted on Render).
* **Database:** MySQL / Firestore (Real-time data synchronization).
* **External APIs:** Google Gemini API (NLP processing), Open-Meteo API (Weather context).
* **Deployment:** Vercel (Web Client), Expo EAS (Android APK).

---

## Getting Started (Local Development)

Follow these instructions to set up the project locally on your machine.

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Expo CLI](https://docs.expo.dev/get-started/installation/)
* Expo Go app on your physical device (or Android Studio Emulator)

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/stepwell.git](https://github.com/your-username/stepwell.git)
   cd stepwell
Install frontend dependencies:

Bash
npm install
Environment Variables:
Create a .env file in the root directory and add your API keys:

Фрагмент кода
EXPO_PUBLIC_API_URL=[https://your-backend-url.onrender.com](https://your-backend-url.onrender.com)
EXPO_PUBLIC_GEMINI_KEY=your_gemini_api_key
Run the Expo application:

Bash
npx expo start
Press a to open in Android emulator, w for web, or scan the QR code with the Expo Go app.

The Team (Group 3)
Aziz Mamedov * Nurali Galiev * Nursultan Habidulla * Tamerlan Sarsenbaev * Vladislav Ertmon Developed as part of the Software Engineering Group Project (Stage 2) for HEALTECH 2026.