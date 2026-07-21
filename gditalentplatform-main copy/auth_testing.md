# Authentication Testing Notes

1. Demo accounts:
- Admin: admin@talentdemo.com / Admin123!
- Coach: coach@talentdemo.com / Coach123!
- Student: student@talentdemo.com / Student123!
- Parent: parent@talentdemo.com / Parent123!

2. Auth API flow:
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout

3. Role routing:
- /login for auth entry
- /app for protected dashboard

4. Verify:
- Each role can log in and load a distinct sidebar
- Student can submit practice logs
- Coach can generate parent summaries and assessments
- Admin/Coach can generate PDF certificates
