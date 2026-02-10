const STORAGE_KEY = "portfolioInvestments";
const PRICE_REFRESH_INTERVAL_MS = 60000;
const YAHOO_QUOTE_API = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=";
const CORS_PROXY_API = "https://api.allorigins.win/raw?url=";

const investmentForm = document.getElementById("investmentForm");
const portfolioBody = document.getElementById("portfolioBody");
const totalInvestedEl = document.getElementById("totalInvested");
const portfolioValueEl = document.getElementById("portfolioValue");
const totalPLEl = document.getElementById("totalPL");
const lastUpdatedEl = document.getElementById("lastUpdated");
const refreshPricesBtn = document.getElementById("refreshPricesBtn");

let allocationChart;
let valueChart;
let investments = loadInvestments();

investmentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const stockName = document.getElementById("stockName").value.trim();
  const ticker = document.getElementById("ticker").value.trim().toUpperCase();
  const quantity = parseFloat(document.getElementById("quantity").value);
  const buyPrice = parseFloat(document.getElementById("buyPrice").value);
  const buyDate = document.getElementById("buyDate").value;

  if (!stockName || !ticker || !quantity || !buyPrice || !buyDate) {
    return;
  }

  const investment = {
    id: crypto.randomUUID(),
    stockName,
    ticker,
    quantity,
    buyPrice,
    buyDate,
    livePrice: null,
    priceError: "",
  };

  investments.push(investment);
  persistAndRender();
  investmentForm.reset();
  refreshLivePrices();
});

refreshPricesBtn.addEventListener("click", () => {
  refreshLivePrices();
});

function loadInvestments() {
  const rawData = localStorage.getItem(STORAGE_KEY);
  if (!rawData) return [];

  try {
    const parsed = JSON.parse(rawData);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      ...item,
      livePrice: typeof item.livePrice === "number" ? item.livePrice : null,
      priceError: item.priceError || "",
    }));
  } catch {
    return [];
  }
}

function saveInvestments() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(investments));
}

function persistAndRender() {
  saveInvestments();
  renderTable();
  renderDashboard();
  renderCharts();
}

async function fetchStockPrices(tickers) {
  if (tickers.length === 0) return {};

  const yahooUrl = `${YAHOO_QUOTE_API}${encodeURIComponent(tickers.join(","))}`;
  const proxiedUrl = `${CORS_PROXY_API}${encodeURIComponent(yahooUrl)}`;
  const response = await fetch(proxiedUrl);
  if (!response.ok) {
    throw new Error(`Price API failed (${response.status})`);
  }

  const data = await response.json();
  const result = data?.quoteResponse?.result || [];
  const bySymbol = {};

  result.forEach((quote) => {
    if (quote.symbol && typeof quote.regularMarketPrice === "number") {
      bySymbol[quote.symbol.toUpperCase()] = quote.regularMarketPrice;
    }
  });

  return bySymbol;
}

async function refreshLivePrices() {
  if (investments.length === 0) {
    lastUpdatedEl.textContent = "Last updated: No holdings";
    return;
  }

  refreshPricesBtn.disabled = true;
  refreshPricesBtn.textContent = "Refreshing...";

  const uniqueTickers = [...new Set(investments.map((item) => item.ticker.toUpperCase()))];

  try {
    const priceMap = await fetchStockPrices(uniqueTickers);

    investments = investments.map((item) => {
      const symbol = item.ticker.toUpperCase();
      const livePrice = priceMap[symbol];

      if (typeof livePrice === "number") {
        return {
          ...item,
          livePrice,
          priceError: "",
        };
      }

      return {
        ...item,
        livePrice: null,
        priceError: "Invalid ticker or market data unavailable",
      };
    });

    lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleString("en-IN")}`;
  } catch (error) {
    investments = investments.map((item) => ({
      ...item,
      priceError: "Could not fetch prices right now",
    }));

    lastUpdatedEl.textContent = `Last updated: Failed (${new Date().toLocaleTimeString("en-IN")})`;
  } finally {
    refreshPricesBtn.disabled = false;
    refreshPricesBtn.textContent = "Refresh Prices";
    persistAndRender();
  }
}

function renderTable() {
  portfolioBody.innerHTML = "";

  if (investments.length === 0) {
    portfolioBody.innerHTML = '<tr><td colspan="10">No investments yet. Add your first stock above.</td></tr>';
    return;
  }

  investments.forEach((item) => {
    const investedAmount = item.quantity * item.buyPrice;
    const liveOrFallbackPrice = typeof item.livePrice === "number" ? item.livePrice : item.buyPrice;
    const currentValue = item.quantity * liveOrFallbackPrice;
    const profitLoss = currentValue - investedAmount;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.stockName}</td>
      <td>${item.ticker}</td>
      <td>${formatNumber(item.quantity)}</td>
      <td>${formatCurrency(item.buyPrice)}</td>
      <td>${formatDate(item.buyDate)}</td>
      <td>
        ${typeof item.livePrice === "number" ? formatCurrency(item.livePrice) : "—"}
        ${item.priceError ? `<span class="error-text">${item.priceError}</span>` : ""}
      </td>
      <td>${formatCurrency(investedAmount)}</td>
      <td>${formatCurrency(currentValue)}</td>
      <td class="${profitLoss >= 0 ? "pl-positive" : "pl-negative"}">${formatCurrency(profitLoss)}</td>
      <td><button class="btn-remove" data-remove-id="${item.id}">Remove</button></td>
    `;

    portfolioBody.appendChild(row);
  });

  portfolioBody.querySelectorAll(".btn-remove").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.target.dataset.removeId;
      investments = investments.filter((item) => item.id !== id);
      persistAndRender();
    });
  });
}

function renderDashboard() {
  const totals = investments.reduce(
    (acc, item) => {
      const invested = item.quantity * item.buyPrice;
      const liveOrFallbackPrice = typeof item.livePrice === "number" ? item.livePrice : item.buyPrice;
      const current = item.quantity * liveOrFallbackPrice;
      acc.invested += invested;
      acc.current += current;
      return acc;
    },
    { invested: 0, current: 0 }
  );

  const totalPL = totals.current - totals.invested;
  totalInvestedEl.textContent = formatCurrency(totals.invested);
  portfolioValueEl.textContent = formatCurrency(totals.current);
  totalPLEl.textContent = formatCurrency(totalPL);
  totalPLEl.className = `metric ${totalPL >= 0 ? "pl-positive" : "pl-negative"}`;
}

function renderCharts() {
  renderAllocationChart();
  renderValueChart();
}

function renderAllocationChart() {
  const labels = investments.map((item) => item.ticker);
  const values = investments.map((item) => {
    const liveOrFallbackPrice = typeof item.livePrice === "number" ? item.livePrice : item.buyPrice;
    return item.quantity * liveOrFallbackPrice;
  });

  if (allocationChart) allocationChart.destroy();

  allocationChart = new Chart(document.getElementById("allocationChart"), {
    type: "pie",
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: generateColors(values.length), borderWidth: 1 }],
    },
    options: {
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });
}

function renderValueChart() {
  const sorted = [...investments].sort(
    (a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime()
  );

  let runningTotal = 0;
  const labels = [];
  const values = [];

  sorted.forEach((item) => {
    const liveOrFallbackPrice = typeof item.livePrice === "number" ? item.livePrice : item.buyPrice;
    runningTotal += item.quantity * liveOrFallbackPrice;
    labels.push(formatDate(item.buyDate));
    values.push(round2(runningTotal));
  });

  if (valueChart) valueChart.destroy();

  valueChart = new Chart(document.getElementById("valueChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Portfolio Value (₹)",
        data: values,
        borderColor: "#365df0",
        backgroundColor: "rgba(54, 93, 240, 0.2)",
        fill: true,
        tension: 0.25,
      }],
    },
    options: {
      scales: {
        y: {
          ticks: {
            callback: (value) => `₹${value}`,
          },
        },
      },
      plugins: {
        legend: {
          display: true,
        },
      },
    },
  });
}

function generateColors(length) {
  const palette = ["#365df0", "#2db87d", "#f9a826", "#8f5af0", "#e64980", "#00a8cc", "#ff6b6b", "#4dabf7"];
  return Array.from({ length }, (_, index) => palette[index % palette.length]);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(value);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

persistAndRender();
refreshLivePrices();
setInterval(refreshLivePrices, PRICE_REFRESH_INTERVAL_MS);
