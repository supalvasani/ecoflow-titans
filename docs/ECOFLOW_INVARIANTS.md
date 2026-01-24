# ECOFlow – System Invariants & Access Rules (Final, Corrected)

This document defines the non-negotiable rules that govern data integrity, versioning, access control, and user behavior across the ECOFlow system.

---

## I. System-Wide Invariants & Rules

These rules apply to **all modules and workflows**.

### 1. No Direct Edits

* Once a Product or BoM is **Active**, it must never be edited directly.
* All modifications must be proposed, reviewed, and applied through an **Engineering Change Order (ECO)**.

---

### 2. Versioning & Archiving Logic

* When an ECO reaches its final stage:

  * If **Version Update = enabled** → a new version is created.
  * If **Version Update = disabled** → changes apply to the same version.
* When a new version is created:

  * The new version becomes **Active**
  * The previous version becomes **Archived**

---

### 3. Immutability of Archived Data

* Archived Products, Product Versions, and BoMs are:

  * Read-only
  * Immutable
  * Preserved permanently for audit and traceability
* Archived Products:

  * Cannot be selected in new BoMs
  * Cannot be selected in new ECOs
  * Remain visible for historical reference

---

### 4. Operational Data Locking

* Only the following may be used in manufacturing or downstream operations:

  * Active Product
  * Active Product Version
  * Active BoM

All other states are non-operational.

---

### 5. Draft Isolation

* Draft or under-approval ECO data:

  * Must never modify master data
  * Must never be visible to Operations users
  * Must never be usable in downstream processes

---

### 6. Full Traceability

Every critical system event must be logged:

* ECO creation
* Stage transitions
* Approvals / validations
* Version creation
* BoM changes
* Product changes

Each log entry must include:

* Action
* Affected record
* Old value → New value
* User
* Timestamp

---

## II. Rules by Page / Module

---

## 1. Products Page

### Visibility

* **Operations Users**

  * See only products with `status = Active`
  * See only the **active version**
  * No version history
  * No draft data
  * No archived versions

* **Engineering Users / Admins**

  * See both Active and Archived products
  * Can view version history

* **Approvers**

  * See all products
  * Can view version history

---

### Version Display

* The current active version must always be displayed automatically.

---

### Change Trigger

* No “Edit” action is allowed.
* Changes must be initiated using **“Propose Change (Create ECO)”**.

---

### Archived Products (UI behavior)

* Visible for traceability
* Clearly marked as Archived
* Disabled for:

  * ECO creation
  * BoM selection

---

### Pending Change Indicator (Derived state)

* Products with open ECOs must display:

  * “Pending Change” badge or
  * Open ECO count

---

## 2. Bills of Materials (BoM) Page

* Every BoM is linked to:

  * A specific Product
  * A specific Product Version

* A BoM is usable only if:

  * It belongs to an **Active product version**

* Old BoM versions must be preserved permanently after updates.

---

## 3. ECO Dashboard & Detail Pages

### Entry Rules

* All ECOs start in the **New** stage.

---

### Validation Rules

* Mandatory fields must be completed before moving past the initial stage.

---

### Master Data Protection

* Changes stored in an ECO must not affect master data until the final stage is approved/applied.

---

### Version Update Flag

* If enabled → create new version
* If disabled → update same version

---

### Stage & Approval Logic

* Approval requirements are stage-based.
* If approval is required:

  * Show **Approve** button
* If approval is not required:

  * Show **Validate** button

---

## 4. Reports & Comparison Pages

### Diff Comparison Rules

* BoM comparisons:

  * Green → Added / Increased
  * Red → Reduced
  * Neutral → Unchanged

* Product comparisons:

  * Sale Price
  * Cost Price
  * Attachments
  * Side-by-side layout

---

### Required Reports

The system must provide:

* Product Version History
* BoM Change History
* Archived Products
* Active Product – Version – BoM Matrix
* Engineering Change Orders Report

---

## III. Rules & Constraints by User Role

---

### Engineering User

* Can:

  * Create and modify ECOs
  * Propose Product and BoM changes
  * Work on draft versions
  * Initiate approval workflows
  * View version history and archived data

* Cannot:

  * Edit master data directly
  * Bypass ECO workflows
  * Approve own changes if stage rules disallow it

---

### Approver

* Can:

  * View all products and versions
  * Review ECO changes
  * Approve or validate ECOs based on stage rules
  * Control when changes become effective

* Cannot:

  * Modify draft data directly
  * Create ECOs
  * Edit master data

---

### Operations User

* Can:

  * View only **Active products**
  * View only **Active versions**
  * View only **Active BoMs**

* Cannot:

  * View archived products or versions
  * View version history
  * View draft or under-approval data
  * Create or modify ECOs
  * Edit any master data

---

### Admin

* Can:

  * Access all modules and data
  * Configure ECO stages
  * Configure approval rules
  * Manage master data settings
  * View all versions and audit logs
  * Create ECOs

---

## Final Note

These rules define the **core safety model** of ECOFlow:

> Stable master data
> Controlled change
> Complete traceability
> Strict role separation
> Zero direct edits
