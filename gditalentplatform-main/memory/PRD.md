# PRD Snapshot

App: School Sports & Music Talent Development Platform

## Confirmed implementation choices
- Secure `.env.example` placeholders with seeded demo accounts for Admin, Coach, Student, Parent
- Database wiring via `DATABASE_URL` for Microsoft SQL Server, with local SQLite demo fallback when env is absent
- Azure OpenAI wrapper using `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_DEPLOYMENT_NAME`
- Azure Blob wrapper using one `app-assets` container and subfolders: `videos/`, `uploads/`, `certificates/`
- Video support: direct uploads + YouTube embeds
- Auto-generated downloadable PDF certificates with dynamic badges

## MVP modules
- JWT auth and role-based dashboard routing
- Activity enrollment for sports and music
- Coach material uploads and student access
- Practice logging with AI-assisted parent summaries
- Assessments, event calendar, roster lead roles, badges, certificates, analytics
