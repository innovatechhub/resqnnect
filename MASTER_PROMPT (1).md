# MASTER_PROMPT.md
## ResQnnect — Project Brief for AI Coding Agents

You are building **ResQnnect: Real-Time Calamity Rescue Operation and Evacuee Monitoring System for the Municipality of Barbaza, Antique**.

This project must be built with:

- **Frontend:** React + Vite
- **Backend:** Supabase
- **Preferred language:** TypeScript
- **UI:** Tailwind CSS
- **Routing:** React Router
- **Forms:** React Hook Form + Zod
- **Data fetching:** TanStack Query
- **Realtime:** Supabase Realtime
- **Maps:** Leaflet
- **Charts:** Recharts
- **QR:** qrcode + html5-qrcode

---

## 1. Project Goal

Build a real-time disaster response and evacuee monitoring platform that improves:

- rescue coordination
- household registration
- evacuee verification
- rescue request handling
- rescuer live tracking
- evacuation center occupancy tracking
- relief distribution
- municipal and barangay reporting

Primary stakeholders:

- MDRRMO Admin
- Barangay Officials
- Rescuers
- Households / Residents

---

## 2. Core Functional Requirements

### Authentication and Access Control
- Supabase Auth
- role-based access control
- protected routes
- approval-aware onboarding if needed

### Household Registry
- households belong to one barangay
- households contain family members
- vulnerable persons should be identifiable
- searchable and filterable records

### QR and Verification
- unique household QR code
- evacuee verification via QR
- fallback verification via family ID or member name
- verification logs

### Rescue Requests
- request form with:
  - emergency type
  - severity level
  - people count
  - GPS/location
  - situation details
  - optional photo
- lifecycle statuses:
  - pending
  - acknowledged
  - assigned
  - in_progress
  - rescued
  - transferred
  - closed

### Rescue Operations
- assign rescuer/team
- update mission status
- log pickup and handover
- keep a mission history trail

### Live Tracking
- real-time rescuer location updates
- mission and request map overlays
- evacuation center locations

### Evacuation Centers
- center profile
- capacity
- occupancy
- arrival logging
- grouped family records

### Relief Distribution
- inventory items
- release/allocation logs
- beneficiary verification
- duplicate prevention

### Dashboards and Reports
- municipality-wide MDRRMO dashboard
- barangay dashboard
- rescuer dashboard
- household dashboard
- printable/exportable reports

---

## 3. Roles

### MDRRMO Admin
Can:
- manage barangays
- manage users
- manage evacuation centers
- view municipality-wide dashboards
- assign rescue teams
- monitor live operations
- view reports
- manage relief distribution oversight

### Barangay Official
Can:
- register and validate households
- manage family records
- review barangay rescue requests
- verify evacuees
- log barangay relief distribution
- view barangay reports

### Rescuer
Can:
- view assigned missions
- update mission status
- share live location
- confirm pickup/handover

### Household / Resident
Can:
- manage profile
- view QR code
- submit rescue requests
- track rescue request status
- view evacuation details

---

## 4. Non-Functional Requirements

The system must be:

- responsive
- mobile-friendly
- secure
- maintainable
- auditable
- scalable across all barangays
- usable in high-stress emergency conditions

Design for:
- intermittent connectivity
- simple workflows
- large touch targets
- clear status indicators
- low-friction UX

---

## 5. Suggested Database Entities

Create a normalized Supabase PostgreSQL schema using tables such as:

- profiles
- roles
- barangays
- households
- household_members
- rescue_requests
- rescue_assignments
- rescuer_locations
- evacuation_centers
- evacuee_records
- relief_inventory
- relief_distributions
- qr_verifications
- notifications
- activity_logs

All major tables should have:
- id
- status where needed
- created_at
- updated_at
- created_by where appropriate

---

## 6. Technical Expectations

### Frontend
Use a clean modular structure:
- pages
- features
- components
- hooks
- services
- lib
- types

### Backend
Use Supabase for:
- auth
- postgres
- realtime
- storage
- row level security

### Security
- Apply RLS on all domain tables
- Restrict access by role and barangay where appropriate
- Never trust client-side role checks alone

---

## 7. Expected Output from AI Agents

When asked to generate implementation output, provide:

1. Overview
2. Architecture
3. Database Schema
4. Folder Structure
5. Route Map
6. Components
7. Supabase Setup
8. Security / RLS
9. Implementation Steps
10. Code

Be concrete, technical, and implementation-ready.

---

## 8. Delivery Phases

### Phase 1
- architecture
- schema design
- route map
- folder structure
- Supabase plan

### Phase 2
- app bootstrap
- auth
- layouts
- route guards
- UI foundation

### Phase 3
- SQL schema
- RLS policies
- seed data
- realtime channels

### Phase 4
- feature modules
- dashboards
- QR flows
- maps
- operations workflows

### Phase 5
- reports
- exports
- tests
- deployment

---

## 9. Immediate Priority

Start with:
- high-level architecture
- full schema proposal
- route/page map
- folder structure
- RLS approach
- implementation roadmap

Avoid vague advice.
