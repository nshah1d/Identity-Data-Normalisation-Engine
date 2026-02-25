# Identity Data Normalisation Engine

![Status](https://img.shields.io/badge/Status-Production-success) ![Privacy](https://img.shields.io/badge/Privacy-Local%20Only-green) ![Platform](https://img.shields.io/badge/Architecture-Zero%20Dependency-blue) ![License](https://img.shields.io/badge/License-MIT-orange)

A privacy-first data integration and schema normalisation pipeline for fragmented identity datasets.

This application acts as a local Master Data Management (MDM) tool. It ingests disconnected contact exports from Google, Apple, and Outlook, parses their inconsistent schemas (CSV and vCard), and normalises them into a unified, queryable JSON structure. Engineered with a strict zero-dependency philosophy, it operates entirely client-side to ensure absolute data sovereignty.

---

## Key Capabilities

* **Heuristic Schema Normalisation:** A custom parsing engine utilises candidate array matching to automatically identify and standardise disparate column headers (for example, mapping "Company", "Organization", and "Work" into a single master node). It also resolves proprietary metadata conflicts like Apple's `X-ABLabel` fragmentation natively.
* **Chunked Memory Management:** Utilises the `IntersectionObserver` API to execute chunked rendering. The engine handles massive datasets by appending DOM elements in batches, ensuring optimal scroll performance without browser freezing.
* **Algorithmic Fuzzy Search:** Features a custom sequential character matcher using bitwise operators. This allows users to query records via shorthand (e.g. "nmsh" matches "Nauman Shahid") with zero latency.
* **Dynamic Export Generation:** Includes a real-time vCard construction engine that generates downloadable `.vcf` blobs on the fly, enabling native data sharing directly from the browser.

---

## Adaptive Presentation Layer

The interface fundamentally alters its layout logic based on device telemetry to present the normalised data optimally.

### Desktop View (Command Centre)
On high-resolution displays, the application renders a persistent three-pane dashboard:
* **Server Index:** Real-time indexing of all available `.vcf` and `.csv` datasets.
* **Master List:** A scroll-optimised list view with an alphabetical jump-anchor gutter.
* **Detail Inspector:** High-fidelity telemetry view with deep-linking protocols (`tel:`, `mailto:`, `wa.me`).

### Mobile View (Field Unit)
On touch devices (<768px), the system shifts to a state-driven navigation stack:
* **Push/Pop Transitions:** Implements hardware-accelerated CSS transforms to mimic native mobile views.
* **Touch Optimisation:** Enlarged hit targets and swipe-friendly navigation maximise the reading viewport.
* **Smart Viewport:** Disables accidental zooming (`user-scalable=no`) to enforce native application behaviour.

---



## Technical Architecture

This project demonstrates advanced data engineering techniques to solve complex data integration problems without external libraries.

### 1. The Ingestion Engine
The parser safely handles edge cases without relying on strict delimiters:
* **CSV Pipeline:** Custom logic splits text strings while respecting quoted boundaries, preventing internal commas from corrupting the dataset schema.
* **VCF Pipeline:** Automatically patches folded lines in vCard streams and extracts nested properties via Regular Expressions to restructure corrupted exports.
* **Content-Aware Validation:** Verifies data types by content. For instance, a phone column is processed only if it satisfies the regex `/\d/`, preventing metadata pollution.

### 2. The Search Logic
Standard string matching was replaced with a bitwise sequential search algorithm:
```javascript
// Iterates through query characters to find sequential matches
// anywhere in the target string, allowing for robust typo tolerance.
if (!~(n = text.indexOf(char, n + 1))) return false;
```
### 3. Asset Management
* **Dynamic Avatar System:** Automatically detects and renders raw Base64 image data, data URIs, or external URLs natively.
* **Fallback Generation:** If no binary image data is present, the system calculates and renders a styled, initials-based profile icon.

---

## Technologies

**Core Stack:** ![PHP](https://img.shields.io/badge/PHP-Backend-777BB4) ![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E) ![HTML5](https://img.shields.io/badge/HTML5-Semantic-E34F26) ![CSS3](https://img.shields.io/badge/CSS3-Variables-1572B6)

**Engineering:** ![Intersection Observer](https://img.shields.io/badge/API-Intersection%20Observer-green) ![Regex](https://img.shields.io/badge/Regex-Heuristic-critical) ![VFS](https://img.shields.io/badge/System-Virtual%20File%20System-lightgrey)

---

## Deployment Protocol

The system is designed for local deployment on any PHP-enabled web server (Apache/Nginx).

1.  **Deploy Core Files:** Upload `index.html`, `app.js`, `style.css`, and `scan.php` to your directory.

2.  **Data Population:** Place your exported `.vcf` or `.csv` files directly in the same directory. The system supports multiple files simultaneously.

3.  **Initialise:** Navigate to the URL. The `scan.php` script will automatically index the file system, and the frontend will execute the ingestion pipeline dynamically.

### Directory Hierarchy

```text
/public_html/identity-data-normalisation-engine/
├── index.html          # Application Shell
├── app.js              # ETL Pipelines & State Management
├── style.css           # Visual Theme & Responsive Rules
├── scan.php            # File System Indexer
├── google_contacts.csv # <--- Raw Data File
└── backup.vcf          # <--- Raw Data File
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
