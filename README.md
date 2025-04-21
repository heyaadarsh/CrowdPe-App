# Crowdfunding Platform 🚀

## 🧩 Introduction
This is a **fully functional crowdfunding platform** built using **HTML, CSS, JavaScript**, and **Firebase** (Realtime Database + Auth).  
It allows users to **create fundraising campaigns**, **donate**, **track progress**, and **interact via comments and updates** — all in real-time.

Whether you're supporting a cause or raising funds for your next big idea, this platform provides a simple, clean, and interactive experience for campaigners and donors alike.

## 🧱 Project Type
Frontend

## 🌐 Deployed App
- **Frontend:** [https://your-netlify-url.netlify.app](https://your-netlify-url.netlify.app)  

## 🎥 Video Walkthrough of the Project
A short video showcasing major platform features, UI, and interaction flows.  
📎 [https://drive.google.com/file/d/1HjCZXci4q2fcXn9BHMeB-WY02IxkiWkL/view](https://drive.google.com/file/d/1HjCZXci4q2fcXn9BHMeB-WY02IxkiWkL/view)

## 🧠 Video Walkthrough of the Codebase
A short walkthrough covering structure, logic, Firebase integration, and JS modules.  
📎 [https://drive.google.com/file/d/18Dz69oqLofUnDZVHjvOVMShQO6KpEMfA/view](https://drive.google.com/file/d/18Dz69oqLofUnDZVHjvOVMShQO6KpEMfA/view)

## 🌟 Features

- 🔐 User Authentication (Login, Signup, Logout)
- 🪄 Interactive Campaign Creation Wizard with live preview
- 💰 Real-Time Donation Tracking with progress bars & milestones
- 📊 Dashboard for campaign creators with campaign stats
- 💬 Live Comment Feed with supporter badges
- 📣 Update posts with media attachments and supporter notifications

## 💡 Design Decisions & Assumptions

- Firebase Realtime DB used for simplicity and real-time updates
- All configuration variables stored in `assets/js/config.js`
- Users must be authenticated to create or donate to a campaign
- Media uploads are simulated (Firebase Storage not included in MVP)
- All pages are client-rendered using vanilla JS and Firebase SDK

## 📁 Directory Structure
crowdfunding-platform/ │ ├── public/ │ ├── index.html │ ├── pages/ │ │ ├── login.html │ │ ├── signup.html │ │ ├── dashboard.html │ │ ├── create-campaign.html │ │ ├── campaign.html │ │ └── profile.html │ ├── assets/ │ │ ├── css/ │ │ │ ├── styles.css │ │ │ ├── auth.css │ │ │ ├── campaign.css │ │ │ ├── dashboard.css │ │ │ └── create-campaign.css │ │ └── js/ │ │ ├── config.js │ │ ├── firebase.js │ │ ├── auth.js │ │ ├── main.js │ │ ├── dashboard.js │ │ ├── createCampaign.js │ │ ├── livePreview.js │ │ ├── campaign.js │ │ └── comments.js


## 🛠️ Installation & Getting Started

```bash
git clone https://github.com/your-username/crowdfunding-platform.git
cd crowdfunding-platform/public
# Open index.html with Live Server or deploy to Netlify
```

## ⚙️ Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password
4. Create **Realtime Database** (Start in test mode)
5. Replace your Firebase config in `assets/js/config.js`

---

## 🧪 Usage

```bash
# Example:
1. Open homepage (index.html)
2. Sign up or log in
3. Go to Dashboard → Create a new campaign
4. Preview & publish
5. Share the campaign
6. Watch live donations and comments
```

## 🔐 Demo Credentials

| Email            | Password   | Role          |
|------------------|------------|---------------|
| demo@user.com    | 123456     | Basic User    |
| admin@admin.com  | admin123   | Campaigner    |

---

## 🔌 APIs Used

- **Firebase Realtime Database**
- **Firebase Authentication**

---

## 🔄 API Endpoints (Firebase DB Structure)

Firebase is NoSQL; endpoints are represented in a hierarchical JSON tree format:

- `users/{userId}` → User details  
- `campaigns/{campaignId}` → Campaign data  
- `donations/{campaignId}/{donationId}` → Donation logs  
- `comments/{campaignId}` → Real-time comments feed  
- `notifications/{userId}` → Supporter notifications  

---

## 🧰 Technology Stack

- **HTML/CSS/JS (Vanilla)**
- **Firebase Realtime Database**
- **Firebase Authentication**
- **Netlify** (for hosting)
- Optional: **Canva or Figma** (for design wireframes)

---

## 📌 Built with ❤️ by Team CrowdPe

