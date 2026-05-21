# StudyFlow

StudyFlow is a vanilla HTML, CSS, and JavaScript student productivity app.

## Current features

- Dashboard with assignment, exam, and study summaries
- Classes page for class details and syllabus import prep
- Assignment tracker
- Exam tracker
- Study timer and study log
- Notes page
- Study statistics page
- Settings page
- Login/Account page connected to Firebase Authentication
- Browser localStorage persistence
- Modular JavaScript and multi-page navigation

## Firebase sync

Firebase Authentication and Cloud Firestore sync use browser-friendly CDN imports. localStorage remains the offline fallback/cache. Signed-in data is stored under `users/{uid}/studyflow/{classes|assignments|exams|studySessions|notes|settings|profile}`.

## Run locally

Use VS Code Live Server or any static server from the project root. For example, if Python is installed:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500`.
