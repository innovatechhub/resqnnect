# ANTIGRAVITY.md
## Mission Guide for Antigravity Agent

This file is for **mission-based autonomous execution** in Antigravity.

Project: **ResQnnect**
Stack: **React + Vite + Supabase**

---

## Core Mission

Build a real-time calamity rescue and evacuee monitoring platform for the Municipality of Barbaza, Antique.

The agent should execute work in small validated missions, not one giant uncontrolled sweep.

---

## Operating Principles

1. Make progress in small increments
2. Prefer complete vertical slices over scattered partial work
3. Keep the app runnable after every mission
4. Do not skip security design
5. Do not skip validation and loading/error handling
6. Respect domain language and role boundaries

---

## Mission Order

### Mission 1 — Project Foundation
Goal:
- initialize React + Vite app
- configure TypeScript
- install core dependencies
- setup Tailwind
- setup routing
- setup basic layout shell
- add environment configuration template

Definition of done:
- app runs
- routes render
- shared layout exists
- lint/build baseline is clean

---

### Mission 2 — Supabase Core Setup
Goal:
- connect Supabase client
- implement auth provider/session bootstrapping
- define profile loading flow
- establish role-aware app state

Definition of done:
- authenticated session can be read
- profile and role can be fetched safely
- protected route scaffold exists

---

### Mission 3 — Data Model and SQL
Goal:
- define normalized SQL schema
- create essential tables
- add foreign keys and indexes
- create basic RLS strategy

Definition of done:
- initial schema SQL exists
- status fields are clear
- core relationships are represented
- RLS direction is documented or implemented

---

### Mission 4 — Route Protection and Layouts
Goal:
- create role-based route groups
- create dashboards per role
- handle unauthorized access
- add loading states for auth/profile resolution

Definition of done:
- users are routed by role
- unauthorized pages exist
- layout shells are reusable

---

### Mission 5 — Household Registry
Goal:
- household list
- household detail view
- family member management
- barangay-scoped management for officials

Definition of done:
- CRUD flows are usable
- validation exists
- tables/forms work cleanly

---

### Mission 6 — Rescue Requests
Goal:
- resident request form
- request list/board
- request status handling
- request details page

Definition of done:
- requests can be submitted and tracked
- statuses are visible
- request workflow is understandable

---

### Mission 7 — Rescue Operations
Goal:
- mission assignment
- rescuer-specific mission views
- mission timeline/status history
- pickup and handover flow

Definition of done:
- assignment workflow functions
- mission states update correctly
- audit trail is visible

---

### Mission 8 — Live Tracking
Goal:
- integrate map
- show request markers
- show rescuer markers
- subscribe to live updates

Definition of done:
- real-time location view works
- map is readable
- mission visibility is meaningful

---

### Mission 9 — Evacuee Verification
Goal:
- QR code generation
- QR scan flow
- fallback manual verification
- verification logs

Definition of done:
- household or evacuee can be verified
- logs are recorded
- duplicate/conflicting verification is controlled

---

### Mission 10 — Evacuation Centers and Relief
Goal:
- center management
- occupancy tracking
- relief inventory
- distribution logs

Definition of done:
- occupancy updates are reflected
- relief records are attributable to households/evacuees
- duplication is minimized

---

### Mission 11 — Reports and Analytics
Goal:
- dashboard summaries
- charts
- exportable reports
- filterable reports by barangay/date/status

Definition of done:
- useful summaries exist
- exports function
- reports reflect real operational entities

---

## Implementation Standards

For every mission, include:
- required types
- service/data layer
- form validation if input exists
- loading state
- empty state
- error state
- responsive behavior

Do not consider UI complete if it only works on desktop.

---

## Mission Output Format

When executing a mission, structure work as:

1. Goal
2. Files to create/update
3. Implementation plan
4. Code changes
5. Validation steps
6. Risks or follow-ups

---

## Guardrails

Do not:
- hardcode credentials
- fake security with client-only checks
- add large unrelated refactors
- create oversized components without reason
- use inconsistent naming for statuses

Do:
- reuse shared UI patterns
- centralize constants and status enums
- keep domain logic in feature modules
- leave the codebase in a stable state

---

## Validation Checklist Per Mission

Before marking a mission complete, verify:

- build is still valid
- route flow still works
- no obvious type breakage
- permissions were considered
- loading and error states exist
- domain naming is consistent

---

## Success Definition

The project is successful when:
- each role can complete its core workflow
- real-time operations are visible
- household and evacuee records are reliable
- rescue coordination is faster and clearer
- the codebase remains maintainable for student and future developer use
