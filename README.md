# AttenDo 🎓

AttenDo is a modern, real-time classroom and attendance management application built for both students and teachers (Admins). It features an elegant Glassmorphism UI, a robust PostgreSQL backend, and live real-time sync across all devices.

## 🚀 Features

- **Real-Time Attendance Tracking:** Admins can instantly mark students present/absent with live percentage updates.
- **Live Assets & Resources (Folders & Files):** Admins can upload PDFs and images securely. Students can download them in real-time. 
- **Universal Pinning System:** Both Admins (Global Pins) and Students (Local Pins) can pin important files and folders to the top of the dashboard.
- **Customizable UI:** Admins can color-code folders to organize subjects visually!
- **Interactive Live Polls:** Admins can launch live polls for instant feedback during lectures.
- **Dark Mode Support:** Built-in seamless dark mode with OLED-friendly dark UI.
- **Cross-Platform:** Works perfectly as a responsive Web App (Vercel) and Native Android App (Capacitor).

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Lucide-React
- **Backend & Database:** Supabase (PostgreSQL), Supabase Auth, Supabase Storage/Realtime
- **File Storage:** Cloudinary (for optimized asset delivery)
- **Mobile Wrapper:** Capacitor JS (for Android APK generation)

## 🔐 Environment Variables

This project requires a `.env.local` file in the root directory. This file is ignored by Git to protect secrets.
You need the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_preset
```

## 📦 Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Add your `.env.local` secrets
4. Start the dev server: `npm run dev`

## 📱 Mobile App (Android)

To build the native Android APK:
1. Run `npm run build`
2. Run `npx cap sync android`
3. Open the `android` folder in Android Studio and build the APK!

---
*Built for the ultimate classroom experience.*
