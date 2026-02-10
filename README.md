# Personal Portfolio Tracker

A simple, beginner-friendly web application to track personal stock investments.

## What this app does

- Lets you add stock investments manually using:
  - Stock name
  - Ticker symbol
  - Quantity
  - Buy price
  - Buy date
- Shows a dashboard with:
  - Total invested amount
  - Current portfolio value
  - Total profit/loss
- Displays a portfolio table with per-stock details:
  - Invested amount
  - Profit/loss
  - Editable current price (so you can update market value manually)
- Includes charts:
  - Pie chart for asset allocation
  - Line chart for portfolio value over time
- Saves all data to `localStorage`, so it stays after page refresh.

## How to run it

1. Clone or download this repository.
2. Open `index.html` in your browser.

That’s it—no build step or installation required.

## Folder structure

```text
.
├── index.html      # Main app layout
├── styles.css      # App styling (responsive UI)
├── script.js       # App logic, localStorage, charts, calculations
└── README.md       # Project documentation
```
