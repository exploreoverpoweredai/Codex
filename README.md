# Personal Portfolio Tracker (India)

A simple, beginner-friendly web application to track personal Indian stock investments.

## What this app does

- Lets you add stock investments manually using:
  - Stock name
  - Ticker symbol (for example: `RELIANCE.NS`, `TCS.NS`)
  - Quantity
  - Buy price
  - Buy date
- Fetches **live stock prices** from a free public Yahoo Finance quote API endpoint (via the AllOrigins CORS proxy).
- Refreshes live prices automatically every **60 seconds**.
- Shows a **Last updated** timestamp for price refreshes.
- Handles invalid symbols by showing a friendly error for that stock row.
- Shows a dashboard with:
  - Total invested amount
  - Current portfolio value
  - Total profit/loss
- Displays a portfolio table with per-stock details:
  - Invested amount
  - Live current value
  - Profit/loss
- Includes charts:
  - Pie chart for asset allocation
  - Line chart for portfolio value over time
- Saves holdings to `localStorage`, so data persists after refresh.

## How to run it

1. Clone or download this repository.
2. Open `index.html` in your browser.

That’s it—no build step required.

## Folder structure

```text
.
├── index.html      # Main app layout
├── styles.css      # App styling (responsive UI)
├── script.js       # App logic, localStorage, live prices, charts
└── README.md       # Project documentation
```
