# MediAI Telehealth Platform — Complete Software Engineering Analysis

**Evidence basis.** This report is derived from the source and configuration files present in the repository on 23 July 2026. File references are repository-relative. Where the implementation is incomplete, inconsistent, or not present, that fact is stated explicitly rather than inferred.

## 1. PROJECT OVERVIEW

### 1.1 Software identity and problem addressed

MediAI is a web-based telehealth platform combining patient symptom self-assessment, doctor discovery, appointment booking, video consultations, medical-document storage, messaging, emergency requests, notifications, and administrative oversight. The principal problem is the fragmentation of remote healthcare activities: a patient needs a single workflow to describe symptoms, locate an appropriate verified clinician, schedule and pay for a consultation, communicate with the clinician, and retain health records. The project also provides an AI-assisted triage and medication-information facility, explicitly framed as informational rather than diagnostic.

The product positioning and feature claims are presented in [frontend/src/pages/LandingPage.jsx](frontend/src/pages/LandingPage.jsx): AI assessment, verified doctors, Jitsi video, emergency assistance, privacy, and global search. The backend implementation is distributed across the Django applications under [backend/apps](backend/apps).

### 1.2 Users and objectives

The implemented roles are `patient`, `doctor`, and `admin`, defined by `User.Role` in [backend/apps/users/models.py](backend/apps/users/models.py). Patients can maintain a health profile, upload records, perform assessments, find doctors, book appointments, join video consultations, message doctors, and submit emergencies. Doctors can maintain professional details, upload verification documents, configure availability, set online status, manage appointments, write consultation notes, and message patients. Administrators can inspect metrics, review doctors, and activate or deactivate users through [backend/apps/admin_panel/views.py](backend/apps/admin_panel/views.py).

The technical objectives evidenced by the implementation are: (1) role-separated telehealth portals; (2) REST API access through Django REST Framework; (3) JWT-based stateless authentication; (4) database persistence using Django ORM and PostgreSQL configuration; (5) asynchronous chat and notification delivery through Channels; (6) external AI and drug-information integrations; (7) cloud file storage through Cloudinary; and (8) deployability through Docker, Railway, Render, and Vercel-oriented configuration.

### 1.3 Scope and boundaries

The scope includes a complete UI shell and many backend endpoints. Payment is explicitly a demonstration flow, not a completed payment gateway: [backend/apps/payments/views.py](backend/apps/payments/views.py) returns a demo reference and simulates confirmation. The AI service may call Gemini, RxNorm, and OpenFDA, but it also has deterministic fallbacks in [backend/apps/ai_engine/services.py](backend/apps/ai_engine/services.py). No source tests, CI pipeline, production observability stack, or completed provider-specific payment implementation was found in the repository inventory.

## 2. SYSTEM ARCHITECTURE

### 2.1 Overall architecture

The system is a layered client/server application:

1. A React single-page application is delivered by Vite during development and Nginx in the container image ([frontend/Dockerfile](frontend/Dockerfile), [frontend/vite.config.js](frontend/vite.config.js)).
2. The browser communicates with Django REST Framework under `/api/` using Axios and Bearer JWTs ([frontend/src/services/api.js](frontend/src/services/api.js)).
3. Django routes requests through [backend/core/urls.py](backend/core/urls.py) into application-specific URL modules.
4. DRF views validate input with serializers, apply permission classes, execute ORM queries, call services or external APIs, and serialize responses.
5. PostgreSQL is the intended persistent relational database, configured through `DATABASE_URL` or individual database variables in [backend/core/settings.py](backend/core/settings.py).
6. ASGI supports HTTP and WebSocket protocols. Chat and notification WebSockets are routed by [backend/core/asgi.py](backend/core/asgi.py), [backend/apps/messaging/routing.py](backend/apps/messaging/routing.py), and [backend/apps/notifications/routing.py](backend/apps/notifications/routing.py).
7. Redis is used as the production Channels layer and Celery broker when `REDIS_URL` is provided; otherwise an in-memory channel layer and memory broker are selected ([backend/core/settings.py](backend/core/settings.py)).
8. Cloudinary stores uploaded documents; Jitsi Meet supplies video rooms; Gemini, RxNorm, and OpenFDA provide external information services.

This modular monolith was chosen because it keeps deployment and domain development relatively simple while separating bounded business areas into Django apps. The application can be recreated without a microservice network, but the external integrations are isolated in service classes or dedicated views.

### 2.2 Frontend architecture

The entry point [frontend/src/main.jsx](frontend/src/main.jsx) creates a React root, wraps the application in a TanStack Query `QueryClientProvider`, and mounts a global `react-hot-toast` toaster. [frontend/src/App.jsx](frontend/src/App.jsx) owns the route tree. `PatientLayout`, `DoctorLayout`, and `AdminLayout` implement nested layouts using React Router `Outlet`; `ProtectedRoute` checks the persisted Zustand authentication state and role.

The UI is organized into pages, layouts, reusable UI primitives, hooks, services, store, and utilities. Query state is managed by TanStack Query; authentication state is managed by Zustand in [frontend/src/store/authStore.js](frontend/src/store/authStore.js). Styling is utility-first Tailwind CSS, with common classes in [frontend/src/index.css](frontend/src/index.css). The design uses responsive grids, mobile sidebar drawers, dark-mode variants, and Lucide icons.

### 2.3 Backend architecture

The backend follows Django's URL–view–serializer–model structure, with service logic for AI/drug enrichment. Views use DRF generic views (`ListAPIView`, `CreateAPIView`, `RetrieveUpdateAPIView`, etc.) where CRUD behavior is conventional and `APIView` where workflow logic is custom. Permission classes such as `IsPatient`, `IsDoctor`, `IsApprovedDoctor`, and `IsAdmin` are implemented in application view modules. There is no separate repository abstraction or domain-service layer for ordinary CRUD; ORM access occurs directly in views.

### 2.4 Request lifecycle

A normal API request is: browser event → service method → Axios request interceptor adds `Authorization: Bearer <access>` → Django security/CORS/session middleware → JWTAuthentication → URL resolver → permission class → serializer validation → view business logic → ORM query or external service → serializer/`Response` → Axios response. On a 401, [frontend/src/services/api.js](frontend/src/services/api.js) performs a single-flight refresh queue against `/auth/token/refresh/`, replaces the access token in Zustand, and retries the original request. If refresh fails, it clears auth and redirects to login.

### 2.5 Module relationships

`users` is the identity root. `patients.PatientProfile`, `doctors.DoctorProfile`, `appointments.Appointment`, `ai_engine.AIAssessment`, `emergency.EmergencyRequest`, `messaging.Conversation`, `notifications.Notification`, and `payments.Payment` reference users directly or indirectly. `DoctorProfile` references `Specialization`; appointments reference doctors and patients; consultation notes reference appointments and doctors; emergency requests can reference an appointment; conversations join a patient and doctor; assessments join a patient and symptoms.

## 3. TECHNOLOGY STACK

| Technology | Role and evidence | Advantages | Alternative |
|---|---|---|---|
| Python 3.11 | Runtime; [runtime.txt](runtime.txt), [backend/runtime.txt](backend/runtime.txt) | Mature web and AI ecosystem | Node.js, Java |
| Django 4.2 | Server framework, ORM, admin, middleware | Productive conventions and secure defaults | FastAPI, Flask |
| Django REST Framework | API views, serializers, permissions, pagination | Strong validation and generic CRUD | Django Ninja, FastAPI |
| PostgreSQL/psycopg2 | Relational persistence | Transactions, relational integrity, JSON fields | MySQL, managed Supabase PostgreSQL |
| Simple JWT | Access/refresh authentication | Stateless API auth and claims | OAuth2, opaque tokens |
| Channels/Daphne | ASGI and WebSockets | Real-time chat/notifications | Socket.IO, managed messaging |
| Redis/channels-redis | Channel layer and Celery broker | Low-latency pub/sub and queues | RabbitMQ, managed queues |
| Celery | Task framework configured in [backend/core/celery.py](backend/core/celery.py) | Background processing | RQ, Dramatiq |
| React 19/Vite | SPA UI and build system | Component reuse and fast dev server | Next.js, Vue |
| React Router | Client routing | Nested role portals | Next routing |
| TanStack Query | Server-state caching, retries, mutations | Request deduplication and cache invalidation | SWR, Redux Toolkit Query |
| Zustand | Authentication store | Small API and persistence-friendly state | Redux, Context |
| Axios | HTTP client/interceptors | Centralized auth refresh and error handling | `fetch`, ky |
| React Hook Form/Zod | Form state and client validation | Low rerender cost and schemas | Formik/Yup |
| Tailwind/PostCSS/Autoprefixer | Styling and build transformations | Responsive utility classes | CSS Modules, MUI |
| Recharts | Admin/doctor charts | React-native chart composition | Chart.js, ECharts |
| Cloudinary | Uploaded document storage | CDN and secure URLs | S3, Azure Blob |
| Gemini | AI question/assessment generation | Generative health-information capability | OpenAI, local model |
| RxNorm/OpenFDA | Medication normalization, labels, interaction information | Public medical data sources | DrugBank, proprietary drug APIs |
| Jitsi Meet/JWT | Video rooms and signed room access | Avoids operating a media server | Daily, Twilio Video |
| Google OAuth | Token verification in [backend/apps/users/views.py](backend/apps/users/views.py) | Familiar social login | Auth0, Microsoft Entra |
| WhiteNoise | Static-file serving | Simple WSGI deployment | Nginx/CDN |
| Gunicorn/Daphne | Production HTTP/ASGI servers | Standard Python deployment | Uvicorn, Hypercorn |
| Docker/Compose | Reproducible local deployment | Encapsulated services | Kubernetes, Podman |
| Railway/Render/Vercel configs | Hosting targets | Low operational overhead | AWS, Azure |

The root and backend requirements differ in pinned versions: [requirements.txt](requirements.txt) uses Django 4.2.16 and Simple JWT 5.3.1, whereas [backend/requirements.txt](backend/requirements.txt) uses Django 4.2.28, Simple JWT 5.4.0, PyJWT, and newer Pillow/requests versions. A production build should standardize on one manifest.

## 4. FRONTEND ANALYSIS

### 4.1 Routing and access control

Public routes in [frontend/src/App.jsx](frontend/src/App.jsx) include `/`, `/login`, `/register`, `/register/doctor`, `/register/admin`, `/forgot-password`, `/reset-password`, and `/verify-email`. Patient routes include dashboard, profile, AI assessment/history, doctor search/detail/booking, appointments, messages, records, medication information, emergency, and video. Doctor routes include dashboard, profile, appointments, availability, messages, patients, notes, video, and analytics. Admin routes include dashboard, doctor verification, users, and analytics. Unauthorized users are sent to `/login`; authenticated users with a wrong role are redirected to their role root.

### 4.2 Pages and interactions

* [frontend/src/pages/LandingPage.jsx](frontend/src/pages/LandingPage.jsx) presents the product value proposition, feature cards, statistics, workflow explanation, emergency call-to-action, and theme toggle.
* Authentication pages use React Hook Form, Zod where defined, TanStack mutations, and toast feedback. [LoginPage.jsx](frontend/src/pages/auth/LoginPage.jsx) logs in and redirects by role. Registration pages create patient, doctor, or admin accounts. Forgot/reset/verification pages implement the corresponding token workflows.
* [frontend/src/pages/patient/Dashboard.jsx](frontend/src/pages/patient/Dashboard.jsx) loads today's appointments and presents quick links. [AIAssessment.jsx](frontend/src/pages/patient/AIAssessment.jsx) implements a three-step state machine: symptoms → follow-up questions → result. It supports search, custom symptoms, loading overlays, severity presentation, medication information, doctor suggestions, and emergency links. [AssessmentHistory.jsx](frontend/src/pages/patient/AssessmentHistory.jsx) lists prior assessments.
* [FindDoctors.jsx](frontend/src/pages/patient/FindDoctors.jsx), [DoctorDetail.jsx](frontend/src/pages/patient/DoctorDetail.jsx), and [BookAppointment.jsx](frontend/src/pages/patient/BookAppointment.jsx) support filtering, detail display, and future-date booking. [Appointments.jsx](frontend/src/pages/patient/Appointments.jsx) filters and cancels patient appointments. [VideoConsultation.jsx](frontend/src/pages/patient/VideoConsultation.jsx) obtains a Jitsi token and embeds the consultation flow.
* [MedicalRecords.jsx](frontend/src/pages/patient/MedicalRecords.jsx) lists, uploads, and deletes records. [MedicationInfo.jsx](frontend/src/pages/patient/MedicationInfo.jsx) searches drug information. [Emergency.jsx](frontend/src/pages/patient/Emergency.jsx) selects emergency types and submits a request. [Messages.jsx](frontend/src/pages/patient/Messages.jsx) combines REST history with a WebSocket chat.
* Doctor pages implement professional profile/document upload ([doctor/Profile.jsx](frontend/src/pages/doctor/Profile.jsx)), appointment status changes ([doctor/Appointments.jsx](frontend/src/pages/doctor/Appointments.jsx)), weekly availability/status ([doctor/Availability.jsx](frontend/src/pages/doctor/Availability.jsx)), patient deduplication ([doctor/Patients.jsx](frontend/src/pages/doctor/Patients.jsx)), consultation notes ([doctor/ConsultationNotes.jsx](frontend/src/pages/doctor/ConsultationNotes.jsx)), analytics ([doctor/Analytics.jsx](frontend/src/pages/doctor/Analytics.jsx)), and chat ([doctor/Messages.jsx](frontend/src/pages/doctor/Messages.jsx)). The doctor video page re-exports the patient implementation.
* Admin pages use charts and mutations for metrics ([admin/Dashboard.jsx](frontend/src/pages/admin/Dashboard.jsx)), doctor verification ([admin/Doctors.jsx](frontend/src/pages/admin/Doctors.jsx)), user activation ([admin/Users.jsx](frontend/src/pages/admin/Users.jsx)), and analytics ([admin/Analytics.jsx](frontend/src/pages/admin/Analytics.jsx)).

### 4.3 Reusable UI and theme

[frontend/src/components/ui/index.jsx](frontend/src/components/ui/index.jsx) provides `Card`, `Badge`, `Avatar`, `Spinner`, `LoadingScreen`, `EmptyState`, `StatCard`, and `MedicalDisclaimer`. [frontend/src/components/ui/Button.jsx](frontend/src/components/ui/Button.jsx) centralizes variants, sizes, disabled state, and a loading spinner. [frontend/src/components/ui/FormFields.jsx](frontend/src/components/ui/FormFields.jsx) supplies labeled input, textarea, and select controls. [frontend/src/components/ui/Logo.jsx](frontend/src/components/ui/Logo.jsx) loads the PNG brand asset. Three layouts provide responsive sidebar navigation. [frontend/src/hooks/useDarkMode.js](frontend/src/hooks/useDarkMode.js) stores the theme in `localStorage` and toggles the root `dark` class.

### 4.4 Validation, loading, and errors

Client validation is strongest on login and registration forms through Zod; other forms mostly use HTML or React Hook Form `required` rules. Mutations expose pending state to buttons. Queries render spinners and empty states. Most errors are toast messages. The Axios response interceptor handles token expiry. There is no global React error boundary, offline retry UI, form schema for all domains, or comprehensive accessibility test evidence.

### 4.5 Important implementation mismatches

The frontend service contract is not fully aligned with backend URLs. For example, [frontend/src/services/index.js](frontend/src/services/index.js) calls `/patients/documents/` for upload while the backend upload-only endpoint is `/api/patients/documents/upload/`; it calls `/doctors/documents/` while the backend route is `/api/doctors/documents/upload/`; it calls `/messages/conversations/` for creation while backend creation is `/api/messages/conversations/create/`; it calls `/emergency/` for list while backend list is `/api/emergency/list/`; it calls `/notifications/read-all/` while backend uses `/api/notifications/mark-read/`; and it calls `/admin-panel/doctors/verify/` while backend list route is `/api/admin-panel/doctors/pending/`. These are verified integration defects, not assumptions. The report evaluator should test and correct them before claiming all UI features are operational.

## 5. BACKEND ANALYSIS

### 5.1 Users and authentication

[backend/apps/users/models.py](backend/apps/users/models.py) defines a UUID custom user with email login, profile fields, role, active/staff flags, email verification, Google ID, timestamps, and indexes on email and role. `UserManager` uses `set_password`, so Django's password hashing is used. Email verification is one-to-one and expires after 24 hours; password-reset tokens are unique, single-use, and checked against a one-hour age in [backend/apps/users/views.py](backend/apps/users/views.py).

[backend/apps/users/views.py](backend/apps/users/views.py) implements patient/doctor registration in atomic transactions, admin registration protected by `ADMIN_SECRET_KEY`, login, a no-op logout response, token refresh, current-user retrieval/update, email verification, password reset, password change, and Google ID-token login. `MediAITokenObtainPairSerializer` adds role, full name, and email to JWT claims and reshapes the response into `{user, tokens}`.

### 5.2 Patients

[backend/apps/patients/models.py](backend/apps/patients/models.py) defines `PatientProfile` and `MedicalDocument`. Patient views restrict profile and document querysets to the authenticated patient. Upload validation accepts JPEG, PNG, and PDF and caps patient upload size at 10 MB before sending to Cloudinary. The document-upload endpoint returns a URL and public ID but does not itself create a `MedicalDocument` row; the list-create endpoint creates a row from a supplied URL. This separation must be reconciled with the frontend workflow.

### 5.3 Doctors

[backend/apps/doctors/models.py](backend/apps/doctors/models.py) defines `Specialization`, `DoctorProfile`, `DoctorDocument`, `DoctorAvailability`, `DoctorVacation`, and `DoctorRating`. Doctor profiles carry verification status, online status, fee, professional data, aggregate rating, consultation count, and earnings. Indexes support verification, online status, and specialization. `DoctorAvailability` has a uniqueness constraint per doctor/day; ratings have a uniqueness constraint per doctor/patient and validators from 1 to 5.

[backend/apps/doctors/views.py](backend/apps/doctors/views.py) provides public specialization/approved-doctor discovery, search/filter/order backends, doctor profile editing, Cloudinary document upload, availability CRUD, status update for approved doctors, vacations, and ratings. Rating creation recomputes the average in Python. The view does not verify that a rater is a patient or has completed an appointment, so this is a security/business-rule gap.

### 5.4 Appointments and consultation notes

[backend/apps/appointments/models.py](backend/apps/appointments/models.py) defines appointments with status choices, video/emergency types, schedule, duration, complaint, optional AI ID, Jitsi room, cancellation data, and indexes. `save()` creates a deterministic `mediai-<uuid>` room. `ConsultationNote` is one-to-one with an appointment and contains SOAP-like fields, follow-up date, sharing flag, and disclaimer.

[backend/apps/appointments/views.py](backend/apps/appointments/views.py) scopes appointment lists to patient or doctor. Creation validates future time and approved/complete doctor profile, saves the patient from the request, and sends notifications. Status transitions are manually limited: doctors can confirm/complete/cancel; patients can cancel. Jitsi access checks participant identity, confirmed status, and a window beginning 15 minutes before and ending duration plus 60 minutes after the appointment. A signed HS256 token is generated if `JITSI_SECRET` exists; otherwise a null token is returned. Notes are scoped by doctor or shared patient visibility.

### 5.5 AI engine

[backend/apps/ai_engine/models.py](backend/apps/ai_engine/models.py) stores seeded `Symptom` records and patient-linked `AIAssessment` records. JSON fields store follow-up answers, possible conditions, and medications. [backend/apps/ai_engine/services.py](backend/apps/ai_engine/services.py) contains three external-data adapters: `GeminiProvider`, `RxNormService`, and `OpenFDAService`. `HealthAssessmentService` asks Gemini for tailored follow-up questions and structured results, parses JSON with regular expressions, enriches medication suggestions using RxNorm/OpenFDA, computes drug interactions through RxNorm, and falls back to keyword-based emergency detection if Gemini is unavailable.

[backend/apps/ai_engine/views.py](backend/apps/ai_engine/views.py) exposes symptom listing, follow-up generation, assessment creation/history/detail, medication information, and doctor suggestion. Assessments persist the request user's symptoms and result. Doctor suggestion builds specialization keywords, filters approved non-offline doctors, prioritizes emergency-duty/available doctors for red severity, orders by online status/rating, and falls back to highest-rated available doctors.

### 5.6 Emergency, messaging, notifications, payments, administration

[backend/apps/emergency/views.py](backend/apps/emergency/views.py) creates an emergency request, randomly selects an approved emergency-duty doctor using `order_by('?')`, creates a confirmed emergency appointment, links the request, and sends a notification. If none is available, it returns a reminder to call emergency services. The detail endpoint uses an unrestricted authenticated queryset, so object-level ownership is not enforced.

[backend/apps/messaging/views.py](backend/apps/messaging/views.py) allows conversation creation only when a patient has a pending, confirmed, or completed appointment with the doctor. Conversation and message lists are role-scoped. [backend/apps/messaging/consumers.py](backend/apps/messaging/consumers.py) authenticates the WebSocket user through `AuthMiddlewareStack`, verifies membership, stores messages, broadcasts message events, and broadcasts typing indicators.

[backend/apps/notifications/tasks.py](backend/apps/notifications/tasks.py) creates persistent notifications and broadcasts them to a per-user channel group. Notification REST views list notifications, count unread records, and mark one/all read. The module is called `tasks.py` but functions are ordinary synchronous functions; no `@shared_task` decorator is present.

Payments in [backend/apps/payments/views.py](backend/apps/payments/views.py) create a one-to-one payment per appointment and support demo confirmation only. Provider choices include Paystack, Flutterwave, and Stripe, but non-demo requests return a future-integration message.

Administration in [backend/apps/admin_panel/views.py](backend/apps/admin_panel/views.py) counts patients, approved doctors, pending verification, completed consultations, recent consultations, top symptoms, specialization demand, and AI severity distribution. Doctor action maps approve/reject/suspend/review to status choices and pushes a notification; user action toggles `is_active`.

## 6. DATABASE ANALYSIS

### 6.1 Tables and relationships

| Table/model | Primary key and important attributes | Relationships/constraints/indexes |
|---|---|---|
| `users` / `User` | UUID; email, names, role, contact, demographics, password, flags, timestamps | Unique email; indexes email/role; groups and permissions inherited |
| `email_verification_tokens` | Auto integer ID; one-to-one user, UUID token, expiry | Unique token; 24-hour application expiry |
| `password_reset_tokens` | Auto integer ID; user, UUID token, used flag, timestamp | Unique token; one-to-many user |
| `patient_profiles` | UUID; one-to-one user; blood group, allergies, conditions, medications, measurements | Cascade from user |
| `medical_documents` | UUID; type, title, URL, notes, upload time | FK patient; ordered newest first |
| `specializations` | UUID; unique name, description, icon | Referenced by doctors |
| `doctor_profiles` | UUID; one-to-one user; license, fee, status, rating/earnings | Unique license; indexes status/online/specialization |
| `doctor_documents` | UUID; type, URL, verified flag | FK doctor |
| `doctor_availability` | UUID; day/time/active | Unique doctor + day |
| `doctor_vacations` | UUID; date range/reason | FK doctor |
| `doctor_ratings` | UUID; integer 1–5, review | Unique doctor + patient; validators |
| `appointments` | UUID; patient, doctor, type/status, time, room, cancellation | Indexes patient/status, doctor/status, scheduled time |
| `consultation_notes` | UUID; one-to-one appointment, doctor, SOAP fields | Cascade appointment; shared flag |
| `symptoms` | UUID; unique name, category, emergency flag | Ordered by name |
| `ai_assessments` | UUID; patient, JSON results, severity, disclaimer, timestamps | M2M symptoms; ordered newest |
| `emergency_requests` | UUID; patient, type/status, assigned doctor, optional appointment, location | Optional FKs; ordered newest |
| `conversations` | UUID; patient, doctor, optional appointment, active/time fields | Unique patient + doctor |
| `messages` | UUID; conversation, sender, content, attachment, read flag | Ordered chronologically |
| `notifications` | UUID; user, type, title/message, read flag, action URL | Ordered newest |
| `payments` | UUID; one-to-one appointment, patient, amount/currency/status/provider/reference | Unique appointment and payment reference |

All application migrations are under each app's `migrations` directory. The migration files confirm explicit table names, UUID keys for domain entities, foreign-key deletion behavior, and later index/field changes.

### 6.2 ERD description

Draw `User` at the center. Connect one user to at most one `PatientProfile` and one `DoctorProfile`; connect a doctor to one `Specialization`, many documents, availability rows, vacations, ratings, appointments, notes, and conversations. Connect a patient/user to many appointments, assessments, emergency requests, messages, notifications, payments, documents through `PatientProfile`, and ratings. Connect each appointment to one patient and doctor, optionally one consultation note, one payment, one emergency request, and one conversation. Connect assessments to many symptoms through the implicit join table. This is a normalized relational design with JSON fields used for flexible clinical answers and professional lists.

## 7. API DOCUMENTATION

The API prefix is `/api`, configured in [backend/core/urls.py](backend/core/urls.py). Default authentication is JWT and default permission is authenticated, except where views override it.

### 7.1 Health and authentication

| Method | Endpoint | Auth | Behavior |
|---|---|---|---|
| GET | `/api/health/` | No | Returns `{"status":"ok"}` |
| POST | `/api/auth/register/patient/` | No; throttled | Validates user fields/password confirmation, creates patient role, issues tokens and verification email |
| POST | `/api/auth/register/doctor/` | No; throttled | Creates doctor role and verification token |
| POST | `/api/auth/register/admin/` | Admin secret; no throttle class | Validates secret/password, creates staff admin and tokens |
| POST | `/api/auth/login/` | No; throttled | Email/password; returns user and access/refresh tokens |
| POST | `/api/auth/logout/` | No | Returns success only; does not blacklist refresh token |
| POST | `/api/auth/token/refresh/` | Refresh token | Returns new access token |
| GET/PATCH | `/api/auth/me/` | Yes | Reads/updates current user serializer fields |
| POST | `/api/auth/verify-email/` | No | Consumes valid unexpired verification token |
| POST | `/api/auth/forgot-password/` | No; throttled | Creates reset token without revealing account existence |
| POST | `/api/auth/reset-password/` | No | Validates one-hour unused token and password policy |
| POST | `/api/auth/change-password/` | Yes | Checks old password and validates new password |
| POST | `/api/auth/google/` | No; throttled | Verifies Google ID token, creates/updates user, issues JWT |

### 7.2 Patient, doctor, appointment, and AI endpoints

| Endpoint family | Methods and purpose |
|---|---|
| `/api/patients/profile/` | GET/PATCH patient profile; patient only |
| `/api/patients/documents/` | GET/POST list/create metadata; patient only |
| `/api/patients/documents/upload/` | POST multipart Cloudinary upload; patient only |
| `/api/patients/documents/<uuid>/` | GET/DELETE own document |
| `/api/doctors/specializations/` | GET public specialization list |
| `/api/doctors/` | GET approved doctors with filters/search/order |
| `/api/doctors/<uuid>/` | GET approved doctor detail |
| `/api/doctors/profile/` | GET/PUT/PATCH own doctor profile |
| `/api/doctors/documents/upload/` | POST multipart document upload |
| `/api/doctors/availability/` | GET/POST own availability |
| `/api/doctors/availability/<uuid>/` | GET/PATCH/DELETE own availability |
| `/api/doctors/status/` | PATCH approved doctor's online status |
| `/api/doctors/vacations/` | GET/POST own vacations |
| `/api/doctors/<uuid>/ratings/` | GET ratings or POST rating |
| `/api/appointments/` | GET role-scoped appointments; POST patient booking |
| `/api/appointments/<uuid>/` | GET/PATCH role-scoped appointment |
| `/api/appointments/<uuid>/status/` | PATCH controlled status transition |
| `/api/appointments/<uuid>/jitsi-token/` | GET participant/time-window checked room credentials |
| `/api/appointments/today/` | GET today's appointments |
| `/api/appointments/notes/` | GET scoped notes; POST doctor note |
| `/api/appointments/notes/<uuid>/` | GET/PATCH scoped note |
| `/api/ai/symptoms/` | GET authenticated symptom catalog |
| `/api/ai/followup-questions/` | POST symptom names; throttled AI generation/fallback |
| `/api/ai/assess/` | POST symptom IDs/names and answers; persists assessment |
| `/api/ai/assessments/` | GET own history |
| `/api/ai/assessments/<uuid>/` | GET own assessment |
| `/api/ai/medication-info/` | POST medication name; throttled external lookup |
| `/api/ai/suggest-doctors/` | POST specialist/severity; returns ranked doctors |

Validation and response schemas are defined in each app's `serializers.py`. Generic DRF errors are normally 400, missing objects are 404, failed permissions are 401/403, and throttling is 429.

### 7.3 Emergency, messaging, notification, payment, and admin endpoints

| Endpoint family | Methods and purpose |
|---|---|
| `/api/emergency/` | POST create emergency |
| `/api/emergency/list/` | GET role-scoped emergency list |
| `/api/emergency/<uuid>/` | GET authenticated emergency detail (object scoping should be tightened) |
| `/api/messages/conversations/` | GET conversations |
| `/api/messages/conversations/create/` | POST conversation after appointment check |
| `/api/messages/conversations/<uuid>/messages/` | GET messages and mark received messages read |
| `/api/notifications/` | GET own notifications |
| `/api/notifications/unread/` | GET unread count |
| `/api/notifications/mark-read/` | POST mark all read |
| `/api/notifications/<uuid>/read/` | POST mark one read |
| `/api/payments/initiate/` | POST create/retrieve appointment demo payment |
| `/api/payments/confirm-demo/` | POST mark own payment as demo-paid |
| `/api/payments/history/` | GET own payment history |
| `/api/admin-panel/dashboard/` | GET admin aggregate metrics |
| `/api/admin-panel/doctors/pending/` | GET doctor profiles filtered by status |
| `/api/admin-panel/doctors/<uuid>/action/` | POST review/approve/reject/suspend |
| `/api/admin-panel/users/` | GET users by role |
| `/api/admin-panel/users/<uuid>/action/` | POST activate/deactivate |
| `/api/admin-panel/analytics/` | GET specialization and severity aggregates |

WebSockets are `/ws/chat/<conversation_uuid>/?token=<access>` and `/ws/notifications/`, routed through [backend/core/asgi.py](backend/core/asgi.py). Chat messages contain type, message ID, content, sender ID/name, and timestamp; typing events contain user ID and typing state.

## 8. SECURITY IMPLEMENTATION

Implemented controls include Django password hashing; password validators; JWT Bearer authentication; role permission classes; queryset ownership for most patient/doctor resources; throttles of 10 auth requests/minute, 20 AI requests/hour, 100 anonymous requests/hour, and 1000 user requests/hour; multipart MIME checks and a 10 MB patient file limit; Cloudinary secure URLs; Google token verification; CSRF middleware; CORS allow-list configuration; X-Frame-Options DENY; content-type nosniff; secure cookies/HSTS when `DEBUG=False`; environment-driven secrets; Jitsi time-window and participant checks; and WebSocket conversation-membership checks.

Important limitations are also verified. JWT refresh tokens are not blacklisted despite installing the blacklist app; logout is a no-op. JWTs are held by the browser state implementation rather than an HttpOnly cookie, increasing XSS impact if an injection occurs. `SECURE_HSTS_SECONDS` is set but HSTS include-subdomains/preload settings are not present. There is no explicit rate limit on several sensitive workflows beyond global defaults. Emergency detail uses an unrestricted queryset. Doctor ratings do not enforce patient role/consultation ownership. Upload validation trusts the declared MIME type and does not show server-side content scanning, filename policy, or size limit for doctor files. The admin secret has an insecure default in [backend/core/settings.py](backend/core/settings.py). SQL injection is reduced by ORM parameterization; no raw SQL is used in reviewed files. React escaping reduces ordinary XSS, but external document URLs and AI text still require safe rendering discipline. No dedicated audit log is implemented.

## 9. WORKFLOW ANALYSIS

### 9.1 Registration and login

The user submits a validated form. Axios posts to the auth service. The DRF serializer validates fields/password policy, `UserManager.create_user()` hashes the password, and the view issues a refresh/access pair. Patient/doctor registration creates a verification token and best-effort email. The frontend stores user/tokens in Zustand and navigates by role. Login failures produce a toast. Email verification consumes and deletes the token; password reset creates a single-use token and replaces the password.

### 9.2 Assessment and doctor recommendation

The patient selects catalog or custom symptoms. The frontend asks for follow-up questions. The backend chooses Gemini or defaults, then the patient submits answers. The backend resolves symptom IDs or creates named symptoms, loads patient context, invokes `HealthAssessmentService`, stores the result and M2M symptoms, and returns serialized persistence plus the transient result. For yellow/red outcomes, the frontend requests suggested doctors; the backend filters approved doctors, applies severity availability rules, specialization keyword matching, rating/online ordering, and fallback selection.

### 9.3 Appointment, payment, and video

A patient opens an approved doctor detail, chooses a future time, and submits the doctor UUID. The serializer verifies approval, specialization, positive fee, and future schedule. The appointment is created with patient ownership and a generated Jitsi room. A payment is initiated separately and is demo-only. After the doctor confirms, either participant requests the Jitsi token. The backend verifies identity, status, and temporal window, then returns room/domain/token. The doctor can mark the appointment completed; notifications are attempted at status changes.

### 9.4 Emergency

The patient chooses a type and submits. The backend creates a pending request, searches approved emergency-duty doctors using random ordering, and if one exists creates a confirmed emergency appointment immediately, links it, sets the room, marks assigned, and notifies the doctor. The UI displays emergency-service reminders and a special childbirth disclaimer. The system does not replace emergency services.

### 9.5 Messaging and notifications

A conversation is allowed only with a doctor having a qualifying appointment. REST loads history and marks other-sender messages read. The browser opens a token-bearing WebSocket; the consumer verifies membership, persists messages, and broadcasts them to the group. Appointment/admin/emergency workflows call notification functions that persist a row and broadcast to the user notification group.

### 9.6 Administration and background work

An admin dashboard aggregates counts through ORM `Count` annotations. Admins review doctor status and can send verification notifications; they activate/deactivate users. Celery is configured, but the reviewed email and notification functions are synchronous and are not declared Celery tasks. Therefore background job infrastructure exists architecturally but is not fully used.

## 10. ALGORITHMS

1. **JWT refresh queue:** Axios uses a single refresh request while concurrent 401 requests wait in `failedQueue` ([frontend/src/services/api.js](frontend/src/services/api.js)).
2. **Symptom grouping/filtering:** The AI page filters by case-insensitive substring and reduces symptoms into category buckets ([frontend/src/pages/patient/AIAssessment.jsx](frontend/src/pages/patient/AIAssessment.jsx)).
3. **AI fallback triage:** `HealthAssessmentService._fallback_assessment()` checks whether symptom text contains emergency keywords; emergency matches produce red severity, otherwise yellow ([backend/apps/ai_engine/services.py](backend/apps/ai_engine/services.py)).
4. **Doctor matching:** specialist text is tokenized into keywords, OR filters are built with `Q`, and results are sorted by online status/rating; top five are returned ([backend/apps/ai_engine/views.py](backend/apps/ai_engine/views.py)).
5. **Emergency assignment:** `order_by('?')` selects a random emergency-duty doctor ([backend/apps/emergency/views.py](backend/apps/emergency/views.py)); this is simple but expensive at scale and not a capacity-aware matching algorithm.
6. **Ratings:** average rating is `sum(rating) / count` and rounded to two decimals ([backend/apps/doctors/views.py](backend/apps/doctors/views.py)).
7. **Analytics:** database aggregation counts symptoms, statuses, specializations, and severity levels ([backend/apps/admin_panel/views.py](backend/apps/admin_panel/views.py)).
8. **Pagination:** DRF page-number pagination is globally configured with page size 20, although the frontend often accepts either `results` or a raw array.

Representative doctor matching pseudocode:

```text
specialist := lower-case specialist string
keywords := words longer than two characters
Q := OR of specialization.name contains each keyword
candidates := approved doctors with related user/specialization
if severity is red: retain emergency-duty or available
else: exclude offline
matched := candidates filtered by Q, ordered online status then rating, first five
if empty: first five ordered by rating
return matched
```

## 11. DESIGN PATTERNS AND PRINCIPLES

The code uses Django's MTV/MVC-like separation, DRF generic-view/template-method patterns, serializer-based DTO validation, service/adaptor classes for external providers, Strategy-like provider fallback (Gemini versus deterministic fallback), Observer-like publish/subscribe through Channels groups, and a state-machine-like frontend assessment step flow. `UserManager` is a framework factory for users. Axios interceptors centralize cross-cutting authentication behavior.

A formal repository pattern and dependency injection container are not present. SOLID is partially demonstrated by separating AI providers and UI primitives, but views directly instantiate services and query ORM models. DRY is supported by shared serializers/components/utilities, while some duplication remains between patient/doctor chat and dashboard code. KISS is visible in direct Django app modules and simple demo payments. Separation of concerns should be improved by moving transaction, matching, and payment logic into testable service classes.

## 12. PROJECT STRUCTURE

* Root files: [manage.py](manage.py) bootstraps Django with the backend path; [requirements.txt](requirements.txt) is a root dependency manifest; deployment descriptors define Railway, Render, Nixpacks, and Compose behavior.
* [backend/core](backend/core) contains settings, WSGI/ASGI entry points, URL routing, and Celery configuration.
* [backend/apps/users](backend/apps/users) contains identity models, serializers, auth views/routes, admin integration, and email functions.
* [backend/apps/patients](backend/apps/patients) contains patient profiles, documents, serializers, URLs, and views.
* [backend/apps/doctors](backend/apps/doctors) contains professional domain models and lifecycle views.
* [backend/apps/appointments](backend/apps/appointments) contains scheduling, status, video authorization, and notes.
* [backend/apps/ai_engine](backend/apps/ai_engine) contains symptoms, persisted assessments, external adapters, and seeding command.
* [backend/apps/emergency](backend/apps/emergency) contains emergency request workflow.
* [backend/apps/messaging](backend/apps/messaging) contains REST conversation history and WebSocket chat.
* [backend/apps/notifications](backend/apps/notifications) contains notification persistence, REST read state, and WebSocket delivery.
* [backend/apps/payments](backend/apps/payments) contains demo payment persistence and workflow.
* [backend/apps/admin_panel](backend/apps/admin_panel) contains role-restricted metrics and moderation.
* Each app's `migrations` directory records schema history; `apps.py` registers application metadata; `serializers.py` describes API representation.
* [frontend/src](frontend/src) contains the SPA. `pages` are route screens, `components/layout` are portal shells, `components/ui` are reusable primitives, `services` are HTTP contracts, `store` is auth state, `hooks` contains theme state, and `utils` contains formatting/class helpers.

## 13. DEPENDENCIES

Backend dependencies are fully listed in [backend/requirements.txt](backend/requirements.txt) and include Django, DRF, Simple JWT, CORS, Channels, channels-redis, psycopg2-binary, Cloudinary, social-auth, Google auth packages, Gemini, Requests, Pillow, decouple, django-filter, Celery, Redis, Gunicorn, WhiteNoise, dj-database-url, django-extensions, and PyJWT. Their use is described in Section 3. The frontend dependencies are fully listed in [frontend/package.json](frontend/package.json): React, Router, TanStack Query, Axios, React Hook Form, Zod/resolvers, Zustand, date-fns, Lucide, clsx/tailwind-merge/class-variance-authority, Radix UI packages, Recharts, react-hot-toast, and Vite/Tailwind/PostCSS tooling.

Unused or lightly evidenced packages should be reviewed: Radix primitives are declared but the reviewed UI mostly uses custom Tailwind controls; Celery is configured but not used as decorated tasks; `django-extensions` has no visible feature in the reviewed source.

## 14. IMPLEMENTATION DETAILS OF MAJOR FEATURES

* **Identity:** custom UUID user, email username, hashed passwords, role claims, reset/verification models ([backend/apps/users/models.py](backend/apps/users/models.py)).
* **AI triage:** prompt construction, JSON extraction, fallback keywords, medication enrichment, and persistence ([backend/apps/ai_engine/services.py](backend/apps/ai_engine/services.py), [backend/apps/ai_engine/views.py](backend/apps/ai_engine/views.py)).
* **Doctor verification:** document upload, status state values, admin action map, rejection reason, verified timestamp ([backend/apps/doctors/views.py](backend/apps/doctors/views.py), [backend/apps/admin_panel/views.py](backend/apps/admin_panel/views.py)).
* **Scheduling:** serializer rules, role-scoped querysets, status transition map, generated Jitsi room ([backend/apps/appointments/serializers.py](backend/apps/appointments/serializers.py), [backend/apps/appointments/views.py](backend/apps/appointments/views.py)).
* **Video:** signed room JWT claims with doctor moderator flag and temporal access window ([backend/apps/appointments/views.py](backend/apps/appointments/views.py)).
* **Files:** Cloudinary upload with accepted MIME types; database URL metadata model for patient records and doctor documents ([backend/apps/patients/views.py](backend/apps/patients/views.py), [backend/apps/doctors/views.py](backend/apps/doctors/views.py)).
* **Real-time:** Channels consumer authentication, membership checks, group broadcasts, persistence, and read-state updates ([backend/apps/messaging/consumers.py](backend/apps/messaging/consumers.py), [backend/apps/notifications/consumers.py](backend/apps/notifications/consumers.py)).
* **Analytics:** ORM aggregation and Recharts rendering ([backend/apps/admin_panel/views.py](backend/apps/admin_panel/views.py), [frontend/src/pages/admin/Analytics.jsx](frontend/src/pages/admin/Analytics.jsx)).

## 15. SYSTEM FLOW

When a user opens the deployed frontend, Nginx serves the Vite-built static assets. React mounts, creates the query client, initializes the router, and starts a health ping in `App.jsx`. A public visitor sees the landing page. After login, the browser posts credentials; Django authenticates with the custom user model and returns JWTs. Zustand stores the user/tokens. The browser selects a nested role layout, and page queries use Axios. The request interceptor adds the access token. Django middleware performs security/CORS processing, DRF validates the JWT and permission class, the view invokes serializers and ORM queries, PostgreSQL returns rows, and DRF serializes JSON. The frontend stores query data in TanStack Query and renders cards, lists, charts, or forms. On expiry, the refresh queue obtains a new access token. For chat/notifications, ASGI routes the WebSocket after `AuthMiddlewareStack` and the consumer uses a channel group. External AI, drug, file, payment, and video providers are called only within their respective workflows.

## 16. PERFORMANCE

Positive measures include database indexes on common appointment, doctor, and user filters; `select_related`/`prefetch_related` in several views; global pagination; TanStack Query stale time of two minutes and one retry; static compression/manifests through WhiteNoise; Vite production bundling; Nginx static serving; Redis channel layer; and Cloudinary-hosted files rather than database binaries.

Limitations include no explicit cache backend for API data, no lazy route/component loading, no database query profiling, no explicit composite index for frequent notification unread queries, no capacity-aware emergency assignment, expensive `order_by('?')`, Python-side rating aggregation, repeated analytics calls, no image transformation policy in the frontend, and no verified compression/CDN policy for all assets. Doctor/appointment list pagination is configured, but frontend pages often load all returned records into memory and perform local filtering. Bundle splitting and performance budgets are absent.

## 17. ERROR HANDLING

DRF serializer validation raises standardized 400 responses. Views explicitly return 400 for invalid actions/status/files, 403 for invalid admin secret or messaging eligibility, 404 for absent objects, and 500 can still arise from unhandled external/provider/database failures. External AI, RxNorm, OpenFDA, email, notification, and appointment notification failures are generally caught and logged or suppressed to preserve the primary workflow. Frontend mutations show toast errors; queries show spinners and empty states. Axios distinguishes network failures from HTTP 401 and implements refresh. Missing are structured error codes, correlation IDs, centralized backend exception formatting, user-visible retry controls, and a React error boundary.

## 18. TESTING

No `tests.py`, `test_*.py`, JavaScript test files, test runner scripts, or CI workflow files appeared in the repository inventory. Consequently, an existing automated testing strategy cannot be claimed. The project should add unit tests for serializers, password/token workflows, permissions, appointment transitions, Jitsi time windows, AI fallback and JSON parsing, doctor matching, emergency assignment, payment ownership, and notification functions. Integration tests should exercise every URL with authenticated patient/doctor/admin clients. WebSocket tests should cover membership rejection and broadcast behavior. Frontend tests should cover protected routes, form validation, Axios refresh concurrency, assessment steps, upload errors, and service/backend URL agreement. End-to-end tests should cover registration → login → assessment → doctor → booking → payment demo → video authorization.

## 19. DEPLOYMENT

Local Compose in [docker-compose.yml](docker-compose.yml) defines PostgreSQL 15, Redis 7, backend, Celery, frontend, and an Nginx edge service. Backend production images install Python requirements and expose port 8000 ([backend/Dockerfile](backend/Dockerfile)); frontend builds with Node 20 and serves `dist` via Nginx ([frontend/Dockerfile](frontend/Dockerfile)). The Compose backend uses Daphne/ASGI, while [Procfile](Procfile), [railway.json](railway.json), [render.yaml](render.yaml), and [nixpacks.toml](nixpacks.toml) use Gunicorn WSGI. This means production WebSocket support depends on choosing the ASGI deployment path rather than the WSGI commands.

Required environment variables include `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `DATABASE_URL` or DB fields, CORS/frontend URLs, Redis, Gemini, Cloudinary, Google OAuth, email, Jitsi, and admin secret values. Render declares many as secret/sync-false. The build runs migrations and collectstatic. No CI/CD workflow, automated migration rollback policy, monitoring, backup policy, or secret rotation procedure is included.

## 20. LIMITATIONS

The most significant limitations are demo-only payments; endpoint mismatches between frontend and backend; incomplete logout token revocation; insecure defaults for secrets; object-level authorization gaps; unvalidated business rules for ratings/availability/date ranges; synchronous external/API work in request paths; absent tests; limited error observability; no explicit audit logging; inconsistent dependency versions; and the medical risk inherent in generative AI output. The frontend contains hard-coded public claims/statistics and a Render health URL fallback. The code should be treated as an academic prototype until these issues are addressed.

## 21. FUTURE WORK

Recommended work is: standardize URLs and add contract tests; implement real Paystack/Stripe/Flutterwave adapters and webhook verification; use HttpOnly secure cookies or a hardened token strategy; blacklist/rotate refresh tokens and implement logout revocation; add object-level permissions and audit events; validate file content and doctor upload size; add transactional appointment conflict detection; replace random emergency selection with availability, load, geography, and escalation rules; use Celery for email/notifications/AI jobs; add Redis caching and query metrics; implement route-level code splitting; improve accessibility and internationalization; add structured logging/monitoring; add comprehensive automated and end-to-end tests; and conduct clinical safety, privacy, and regulatory review.

## 22. FINAL YEAR PROJECT DOCUMENTATION — CHAPTER FOUR

### 22.1 Software requirements

The software requires Python 3.11, PostgreSQL 15-compatible database service, Redis for production real-time/queue behavior, Node.js 20 for frontend builds, a modern browser with WebSocket support, and external credentials for Cloudinary, Gemini, Google OAuth, email, and optionally Jitsi JWT. Development may use Docker Compose; production may use Render/Railway plus Vercel/Nginx.

### 22.2 Hardware requirements

The repository does not define hardware specifications. A reasonable evaluation environment is a dual-core or better CPU, 4–8 GB RAM, SSD storage, broadband internet, and a camera/microphone for video testing. Production sizing is not specified and must be load-tested.

### 22.3 System design and implementation process

The implementation process is domain decomposition into Django apps, schema-first model/migration design, serializer-based API validation, role-specific views, React route/layout construction, external adapter integration, and deployment configuration. The database is migrated with Django commands; initial catalog data is seeded using `python manage.py seed_symptoms` from [backend/apps/ai_engine/management/commands/seed_symptoms.py](backend/apps/ai_engine/management/commands/seed_symptoms.py).

### 22.4 Module description

The modules are identity, patient records, doctors, appointments, AI, emergency, messaging, notifications, payments, administration, frontend layouts/pages, service client, auth store, and theme/UI primitives. Their responsibilities and coupling are documented in Sections 4–5 and 12–14.

### 22.5 Input and output design

Inputs include registration credentials, profile fields, symptom IDs/names and follow-up answers, doctor filters, appointment date/time and complaint, files and document types, status/action values, chat messages, emergency type/location, payment reference, and medication names. Outputs are JSON resources, paginated results, JWT pairs, URLs, notifications, WebSocket events, charts, toast messages, and Jitsi room credentials. Medical outputs always include disclaimer text in backend models/services and frontend components.

### 22.6 Security, testing, and deployment

Security uses hashed passwords, JWT, permissions, throttles, CORS, CSRF/security middleware, secure production flags, Cloudinary, and WebSocket membership checks, but the limitations in Sections 8, 18, and 20 must be recorded in an academic evaluation. Testing should follow the recommended pyramid because no current test suite was found. Deployment uses migrations, static collection, Gunicorn/Daphne, PostgreSQL, Redis, Nginx, and environment variables.

## 23. CODE REFERENCES

The implementation is concentrated in [backend/core/settings.py](backend/core/settings.py), [backend/core/urls.py](backend/core/urls.py), [backend/core/asgi.py](backend/core/asgi.py), all app-level `models.py`, `serializers.py`, `views.py`, `urls.py`, and `services.py` files under [backend/apps](backend/apps), plus [frontend/src/App.jsx](frontend/src/App.jsx), [frontend/src/main.jsx](frontend/src/main.jsx), [frontend/src/services/index.js](frontend/src/services/index.js), [frontend/src/services/api.js](frontend/src/services/api.js), [frontend/src/store/authStore.js](frontend/src/store/authStore.js), the layouts under [frontend/src/components/layout](frontend/src/components/layout), reusable UI under [frontend/src/components/ui](frontend/src/components/ui), and pages under [frontend/src/pages](frontend/src/pages). These files are the primary sources to cite in a final-year report.

## 24. DIAGRAM SPECIFICATIONS

* **Use-case diagram:** Actors Patient, Doctor, Administrator, Gemini/OpenFDA/RxNorm, Cloudinary, Jitsi, email provider, and emergency services. Patient use cases: register/login, assess symptoms, find/book/pay, video, records, medication, emergency, messages. Doctor: profile/documents, verification, availability, appointments, notes, video, messages. Admin: verify doctors, manage users, analytics.
* **Class diagram:** Center `User`; associate `PatientProfile` and `DoctorProfile`; associate `DoctorProfile` to `Specialization`, `DoctorDocument`, `DoctorAvailability`, `DoctorVacation`, `DoctorRating`; associate `Appointment` to patient/doctor, `ConsultationNote`, `Payment`, `EmergencyRequest`, and `Conversation`; associate `Conversation` to `Message`; associate patient to `AIAssessment` and `Symptom` M2M; associate user to `Notification` and token classes.
* **ER diagram:** Use the table relationships in Section 6.1, with crow's-foot notation and cascade/set-null labels.
* **Sequence diagram:** Browser login → Axios → URL resolver → JWT serializer → User ORM → PostgreSQL → token response → Zustand; repeat for appointment and AI assessment, adding external provider calls and notification broadcasts.
* **Activity diagram:** For assessment, select symptoms → validate nonempty → request questions → answer → submit → resolve/create symptoms → load patient context → Gemini/fallback → enrich medications → persist → suggest doctors for yellow/red → display disclaimer.
* **Component diagram:** React SPA, Axios client, Zustand, TanStack Query, Django REST API, Django ORM, PostgreSQL, Channels/ASGI, Redis, Celery, Cloudinary, Gemini/RxNorm/OpenFDA, Jitsi, Google OAuth, email.
* **Deployment diagram:** Browser → Vercel/Nginx frontend; API container → Gunicorn/Daphne; PostgreSQL; Redis; Celery worker; Cloudinary; external AI/drug/video/OAuth/email services. Show environment variables as configuration edges.
* **DFD:** Level 0 shows users exchanging requests/responses with MediAI and external providers. Level 1 decomposes auth, clinical assessment, scheduling, communication, emergency, payments, administration, and storage. Data stores are PostgreSQL, Cloudinary, Redis/channel groups, and email.

## 25. FINAL SUMMARY AND EVALUATION

MediAI is a credible modular telehealth prototype with broad feature coverage, a coherent role model, well-separated Django apps, UUID-based domain entities, a practical React UI, REST and WebSocket communication, external medical-data integration, deployment manifests, and meaningful safety disclaimers. The strongest engineering choices are the use of framework-supported authentication/ORM/serializers, role-scoped querysets in most domains, database indexes, typed choices/validators, AI fallback behavior, and clear reusable frontend primitives.

Its weaknesses are operational and correctness-oriented rather than conceptual: no automated tests, inconsistent frontend/backend route contracts, demo payments, no true refresh-token revocation, several authorization gaps, synchronous external calls, incomplete queue usage, inconsistent dependency manifests, and insufficient production observability. Scalability is reasonable for a small modular deployment but is constrained by random database ordering, in-process fallback channels, Python-side aggregation, whole-list client processing, and absent caching/load tests. Maintainability benefits from app boundaries and shared components but is reduced by direct ORM logic in views and duplicated UI workflows. Security is above a minimal prototype because JWT, hashing, permissions, throttling, secure headers, and upload checks exist, but healthcare deployment requires stronger object authorization, auditability, secret hygiene, token storage/revocation, file scanning, and clinical governance. Extensibility is promising: payment adapters, AI providers, notification channels, and frontend services can be expanded, especially if formal service interfaces and API contract tests are introduced.

Overall, the codebase demonstrates the implementation of a substantial final-year project system, but the report should distinguish implemented features from advertised or partially wired features. Before production or clinical use, the verified defects and limitations listed above must be resolved and independently security- and safety-reviewed.
