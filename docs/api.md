# API Reference Specification

All endpoints are prefixed with `/api`. Protected routes require a Bearer token in the `Authorization` header: `Authorization: Bearer <token>`.

Standard response formats:
- **Success**: `{ "success": true, "message": "...", "data": { ... }, "meta": { ... } }`
- **Error**: `{ "success": false, "message": "...", "errorCode": "ERROR_CODE", "errors": [...] }`

---

## 1. System Health
### `GET /api/health`
Returns server uptime, environment, and MongoDB database connectivity status.

---

## 2. Authentication (`/api/auth`)

### `POST /api/auth/register`
Creates a candidate account and issues a signed JWT.
- **Body**: `{ "name": "Jane Doe", "email": "jane@example.com", "password": "password123" }`
- **Status**: `201 Created`

### `POST /api/auth/login`
Authenticates credentials and returns a JWT token.
- **Body**: `{ "email": "jane@example.com", "password": "password123" }`
- **Status**: `200 OK`

### `GET /api/auth/me` *(Protected)*
Fetches authenticated user identity and dashboard counts.
- **Status**: `200 OK`

---

## 3. Resume Processing (`/api/resumes`)

### `POST /api/resumes` *(Protected, Multipart)*
Uploads and parses a PDF, DOCX, or TXT file into raw text and triggers structured AI profile extraction.
- **Body**: `multipart/form-data` with `file`
- **Status**: `201 Created`

### `GET /api/resumes` *(Protected)*
Lists all resumes uploaded by the authenticated user.

### `GET /api/resumes/:id` *(Protected)*
Retrieves complete resume record including parsed skill inventory, experience, and education.

### `POST /api/resumes/:id/analyze` *(Protected)*
Re-runs AI structured extraction on the resume raw text and re-evaluates all saved jobs.

### `DELETE /api/resumes/:id` *(Protected)*
Deletes the candidate resume.

---

## 4. Job Management (`/api/jobs`)

### `POST /api/jobs` *(Protected)*
Adds a job posting and triggers background requirement extraction & compatibility heuristic against candidate resume.
- **Body**:
  ```json
  {
    "title": "Staff Backend Engineer",
    "company": "Stripe",
    "location": "Remote",
    "employmentType": "Full-time",
    "description": "We are seeking a senior backend engineer proficient in Node.js, Go, Redis, and distributed systems...",
    "sourceUrl": "https://stripe.com/jobs/123"
  }
  ```

### `GET /api/jobs` *(Protected)*
Queries jobs with optional keyword search (`?search=`), match score threshold (`?matchMin=`), and pagination (`?page=&limit=`).

### `GET /api/jobs/:id` *(Protected)*
Retrieves job details, parsed criteria, and associated application pipeline record.

### `PATCH /api/jobs/:id` *(Protected)*
Updates job fields. Re-triggers analysis if `description` was modified.

### `DELETE /api/jobs/:id` *(Protected)*
Deletes job and cleans up corresponding applications.

### `POST /api/jobs/:id/analyze` *(Protected)*
Forces AI extraction of required vs preferred skills, years of experience, and responsibilities.

### `POST /api/jobs/:id/match` *(Protected)*
Computes transparent compatibility analysis between candidate resume and job criteria.

### `POST /api/jobs/:id/generate-message` *(Protected)*
Generates a customized outreach note.
- **Body**: `{ "tone": "Professional" | "Concise" | "Friendly" }`

---

## 5. Application Tracking (`/api/applications`)

### `POST /api/applications` *(Protected)*
Enrolls a job into the application tracker.
- **Body**: `{ "jobId": "...", "status": "Saved" | "Applied" | "Interview" | "Assessment" | "Offer" | "Rejected" | "Withdrawn", "notes": "..." }`

### `GET /api/applications` *(Protected)*
Fetches all pipeline applications with optional `?status=` filter.

### `GET /api/applications/stats` *(Protected)*
Returns aggregate metrics for pipeline stages (saved, applied, interviews, offers).

### `PATCH /api/applications/:id` *(Protected)*
Updates status and appends an entry to the status change timeline.

### `DELETE /api/applications/:id` *(Protected)*
Removes the application from tracking.

---

## 6. AI Agent (`/api/agent`)

### `GET /api/agent/conversations` *(Protected)*
Returns past conversation sessions.

### `POST /api/agent/conversations` *(Protected)*
Initializes a new conversation session.

### `GET /api/agent/conversations/:id` *(Protected)*
Returns user and assistant messages for a session.

### `DELETE /api/agent/conversations/:id` *(Protected)*
Clears the session message history.

### `POST /api/agent/chat` *(Protected)*
Sends a user message to the Autonomous Job Agent. The agent executes function calling across authorized tools and returns the final response alongside real-time action steps.
- **Body**: `{ "conversationId": "...", "message": "Compare my resume against my saved backend jobs" }`
