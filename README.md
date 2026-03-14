# Inventory Clicker V7 Pro

A stronger offline-first version tailored for bar/nightclub workflow.

## What is included

- Night setup
- Multi-bar + multi-bartender workflow
- Item cards with fast actions
- Complimentary bottle / drink tracking
- Free shot ticket tracking
- Quick overview modal
- Per-bartender breakdown
- Google Sheet reporting bridge
- Offline local persistence
- Backup / restore
- PWA manifest + service worker

## Google Sheet integration

This package does **not** contain Google credentials.

Use a Google Apps Script Web App as a bridge and paste these values in **Settings**:
- Google Apps Script Web App URL
- Google Sheet URL

Expected payload:
- spreadsheetId
- night
- rows
- summary
- barSummary

## Open

Open `index.html` in a browser.

For better offline behavior, serve locally or open once and install it as a PWA in Chrome/Safari-compatible browsers.
