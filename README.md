# Contacts Hub

![Status](https://img.shields.io/badge/Status-Completed-success) ![Privacy](https://img.shields.io/badge/Privacy-Local%20Only-green) ![Platform](https://img.shields.io/badge/Platform-Web-blue) ![License](https://img.shields.io/badge/License-MIT-orange)

[![Live Demo](https://img.shields.io/badge/Demo-Live%20Preview-brightgreen?style=for-the-badge&logo=google-chrome&logoColor=white)](https://www.nauman.cc/contacts-hub)

A robust, self-hosted web application for visualizing `.vcf` (vCard) and `.csv` contact libraries. This tool features a custom-built parsing engine capable of handling complex contact formats, including Apple iCloud metadata and multi-line vCard streams, presented in a modern, dark-themed 3-pane interface.

---

## Key Features

* **Multi-Format Support:** Seamlessly parses both standard `.vcf` files (single or multiple contacts per file) and `.csv` exports.
* **Advanced VCF Parsing:** Custom Regex engine specifically tuned to handle "Apple-style" vCard grouping (e.g., mapping `item1.TEL` to `item1.X-ABLabel` to correctly display custom labels like "Anniversary" or "Main").
* **3-Pane Layout:** Intuitive navigation flow: **Library Index** → **Contact List** → **Detailed View**.
* **Smart Search:** Real-time filtering by name or organization.
* **Zero Dependencies:** Built with pure Vanilla JS and PHP. No Node.js, Composer, or databases required.
* **Clipboard Integration:** One-click copying for individual fields (phone, email, notes) or the full JSON data representation of the contact.
* **Privacy Focused:** Runs entirely on your own server; no data is sent to third parties.

---

## Technical Highlights

This project demonstrates full-stack proficiency with a focus on data parsing and UI architecture:

* **Regex Parsing Engine:** Implements a two-pass parsing logic to link "Orphaned" metadata (like custom labels) to their parent values within the vCard standard.
* **Backend Logic:** Utilizes PHP's `glob` function for dynamic file system traversal, allowing the app to auto-discover new contact files dropped into the directory.
* **DOM Manipulation:** Efficient rendering of large lists using vanilla JavaScript, featuring dynamic alphabet jumping and lazy DOM updates.
* **CSS Architecture:** Fully custom CSS using CSS Variables (`:root`) for easy theming and dark mode consistency, with custom webkit scrollbar styling.

---

## Parsing Logic Detail

The application handles the specific quirks of mobile contact exports:

1. **Unfolding:** It first "unfolds" wrapped lines (standard in VCF 3.0) to ensure base64 photos and long notes are continuous strings.
2. **Group Mapping:** It scans for `itemX.X-ABLabel` to identify custom labels (e.g., "Manager's Cell") and maps them back to the corresponding `TEL` or `URL` field.
3. **Sanitization:** Automatically converts literal `\n` characters in Notes to HTML line breaks for proper display.

---

## Technologies Used

**Languages:** ![PHP](https://img.shields.io/badge/PHP-777BB4?style=flat&logo=php&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)

**Tools & Concepts:** ![Regex](https://img.shields.io/badge/Regex-Parsing%20Engine-critical) ![vCard](https://img.shields.io/badge/vCard-4.0%20Standard-success) ![DOM](https://img.shields.io/badge/DOM-Manipulation-orange) ![Git](https://img.shields.io/badge/Git-F05032?style=flat&logo=git&logoColor=white)

---

## Installation & Usage

1.  **Upload:** Upload the files to any PHP-enabled web server (Apache/Nginx).
2.  **Add Data:** Drop your `.vcf` or `.csv` files into the same directory.
3.  **Browse:** Navigate to `index.html`. The app will automatically scan the directory via the API and populate the interface.

### Directory Structure

Ensure your server is structured as follows:

```text
/contacts-hub/
├── index.html        # Main frontend entry point
├── style.css         # Dark theme and layout styles
├── app.js            # Parsing logic, API fetch, and UI rendering
├── scan.php          # Backend API to scan directory for files
├── Friends.vcf       # Your contact files...
├── Work_Backup.csv
├── Corporate.vcf
└── ...
```

---

> _Designed & developed by Nauman Shahid_
