# Contacts Hub

![Status](https://img.shields.io/badge/Status-Production-success) ![Privacy](https://img.shields.io/badge/Privacy-Local%20Only-green) ![Platform](https://img.shields.io/badge/Architecture-Polymorphic-blue) ![License](https://img.shields.io/badge/License-MIT-orange) [![Live Demo](https://img.shields.io/badge/Demo-Live%20Preview-31B33B)](https://www.nauman.cc/demo/contacts/)

A privacy-first contact normalisation and visualisation engine.

This application acts as a universal bridge for fragmented contact data, ingesting disparate export formats (Google CSV, Apple vCard, Outlook) and unifying them into a single, normalised schema. Engineered with a "Zero-Dependency" philosophy, it operates entirely client-side to ensure absolute data sovereignty.

---

## Key Capabilities

* **Heuristic Data Normalisation:** Proprietary parsing logic automatically detects and maps inconsistent column headers (e.g., mapping "Given Name", "First", and "J. Doe" to a unified structure) and resolves proprietary metadata conflicts (such as Apple's `X-ABLabel` fragmentation).
* **High-Performance Virtualisation:** Utilises an **Intersection Observer** strategy to implement "Chunked Rendering." The engine handles datasets of 10,000+ records with constant memory usage (O(1) DOM complexity), ensuring 60fps scroll performance.
* **Algorithmic Fuzzy Search:** Features a custom **Sequential Character Matcher** using bitwise operators. This allows users to query contacts via shorthand (e.g., "nmsh" matches "Nauman Shahid") with zero latency.
* **RFC-Compliant Interoperability:** Includes a real-time vCard 3.0 construction engine that generates downloadable `.vcf` blobs on the fly, enabling native contact sharing from the browser to mobile devices.

---

## Adaptive Architecture

The interface features a **Polymorphic UI** that fundamentally alters its navigation paradigm based on device telemetry.

### Desktop: The Command Centre
On high-resolution displays, the application renders a persistent **Three-Pane Dashboard**:
* **Library Pane:** Real-time indexing of all available `.vcf` and `.csv` datasets.
* **List View:** Virtualised scroll area with an alphabetical "Jump-Anchor" gutter.
* **Detail Inspector:** High-fidelity telemetry view with deep-linking protocols (`tel:`, `mailto:`, `wa.me`).

### Mobile: The Native Stack
On touch devices (<768px), the system shifts to a **State-Driven Navigation Stack**:
* **Push/Pop Transitions:** Implements hardware-accelerated CSS transforms (`translateX`) to mimic native iOS view controllers.
* **Touch Optimisation:** Enlarged hit targets and a "Slide-Out" library drawer maximise the reading viewport.
* **Smart Viewport:** Disables accidental zooming (`user-scalable=no`) to enforce native application behaviour.

---

## Engineering Deep Dive

This project demonstrates advanced **Full Stack Engineering** techniques to solve complex data problems without external libraries.

### 1. The Ingestion Engine
The parser does not rely on simple delimiters. It uses a custom **State Machine** to handle edge cases:
* **RFC Unfolding:** Automatically detects and patches "folded" lines in vCard streams, fixing corrupted Base64 image data often found in large Apple exports.
* **Content-Aware Validation:** Verifies data types by content rather than headers. For example, a column labelled "Phone" is ignored if the content does not satisfy the regex `/\d/`, preventing metadata pollution.
* **Recursive Mapping:** Tracks grouped items (e.g., `item1.TEL`) to ensure custom labels are correctly re-associated with their corresponding data fields.

### 2. The Search Logic
Standard string matching was replaced with a bitwise sequential search algorithm:
```javascript
// Simplified Logic:
// Iterates through query characters to find sequential matches
// anywhere in the target string, allowing for robust typo tolerance.
if (!~(n = text.indexOf(char, n + 1))) return false;
```
### 3. Identity & Asset Management
* **Dynamic Avatar System:** Automatically detects and renders raw Base64 image data, data URIs, or external URLs.
* **Fallback Generation:** If no binary image data is present, the system calculates and renders a styled, initials-based profile icon.

---

## Technologies

**Core Stack:** ![PHP](https://img.shields.io/badge/PHP-Backend-777BB4) ![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E) ![HTML5](https://img.shields.io/badge/HTML5-Semantic-E34F26) ![CSS3](https://img.shields.io/badge/CSS3-Variables-1572B6)

**Engineering:** ![Intersection Observer](https://img.shields.io/badge/API-Intersection%20Observer-green) ![Regex](https://img.shields.io/badge/Regex-Heuristic-critical) ![VFS](https://img.shields.io/badge/System-Virtual%20File%20System-lightgrey)

---

## Deployment Protocol

The system is designed for "Drop-and-Run" deployment on any PHP-enabled web server (Apache/Nginx).

1.  **Deploy Core Files:**
    Upload `index.html`, `app.js`, `style.css`, and `scan.php` to your directory.

2.  **Data Population:**
    Place your exported `.vcf` or `.csv` files directly in the same directory. The system supports multiple files simultaneously.

3.  **Initialise:**
    Navigate to the URL. The `scan.php` script will automatically index the Virtual File System (VFS), and the frontend will hydrate the library list dynamically.

### Directory Hierarchy

```text
/public_html/contacts-hub/
├── index.html          # Application Shell
├── app.js              # State Management, Virtualisation & Parsing Logic
├── style.css           # Tokyo Night Theme & Responsive Rules
├── scan.php            # File System Indexer
├── google_contacts.csv # <--- Your Export File
└── backup.vcf          # <--- Another Export File
```

---

<div align="center">
<br>

**_Architected by Nauman Shahid_**

<br>

[![Portfolio](https://img.shields.io/badge/Portfolio-nauman.cc-000000?style=for-the-badge&logo=googlechrome&logoColor=white)](https://www.nauman.cc)
[![GitHub](https://img.shields.io/badge/GitHub-nshah1d-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/nshah1d)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/nshah1d/)

</div>
<br>

---