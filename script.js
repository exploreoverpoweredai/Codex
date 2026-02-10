const STORAGE_KEY = "portfolioInvestments";

const investmentForm = document.getElementById("investmentForm");
const portfolioBody = document.getElementById("portfolioBody");
const totalInvestedEl = document.getElementById("totalInvested");
const portfolioValueEl = document.getElementById("portfolioValue");
const totalPLEl = document.getElementById("totalPL");

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
    currentPrice: buyPrice,
  };

  investments.push(investment);
  persistAndRender();
  investmentForm.reset();
});

function loadInvestments() {
  const rawData = localStorage.getItem(STORAGE_KEY);
  if (!rawData) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : [];
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

function renderTable() {
  portfolioBody.innerHTML = "";

  if (investments.length === 0) {
    portfolioBody.innerHTML = '<tr><td colspan="9">No investments yet. Add your first stock above.</td></tr>';
    return;
  }

  investments.forEach((item) => {
    const investedAmount = item.quantity * item.buyPrice;
    const currentValue = item.quantity * item.currentPrice;
    const profitLoss = currentValue - investedAmount;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.stockName}</td>
      <td>${item.ticker}</td>
      <td>${formatNumber(item.quantity)}</td>
      <td>${formatCurrency(item.buyPrice)}</td>
      <td>${formatDate(item.buyDate)}</td>
      <td>
        <input
          class="current-price-input"
          type="number"
          min="0"
          step="0.01"
          value="${item.currentPrice}"
          data-id="${item.id}"
          aria-label="Current price for ${item.ticker}"
        />
      </td>
      <td>${formatCurrency(investedAmount)}</td>
      <td class="${profitLoss >= 0 ? "pl-positive" : "pl-negative"}">${formatCurrency(profitLoss)}</td>
      <td><button class="btn-remove" data-remove-id="${item.id}">Remove</button></td>
    `;

    portfolioBody.appendChild(row);
  });

  portfolioBody.querySelectorAll(".current-price-input").forEach((input) => {
    input.addEventListener("change", (event) => {
      const id = event.target.dataset.id;
      const value = parseFloat(event.target.value);

      if (Number.isNaN(value) || value < 0) {
        event.target.value = "0";
        return;
      }

      investments = investments.map((item) =>
        item.id === id ? { ...item, currentPrice: value } : item
      );
      persistAndRender();
    });
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
      const current = item.quantity * item.currentPrice;
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
  const labels = investments.map((item) => `${item.ticker}`);
  const values = investments.map((item) => item.quantity * item.currentPrice);

  if (allocationChart) {
    allocationChart.destroy();
  }

  allocationChart = new Chart(document.getElementById("allocationChart"), {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: generateColors(values.length),
          borderWidth: 1,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          position: "bottom",
        },
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
    runningTotal += item.quantity * item.buyPrice;
    labels.push(formatDate(item.buyDate));
    values.push(round2(runningTotal));
  });

  if (valueChart) {
    valueChart.destroy();
  }

  valueChart = new Chart(document.getElementById("valueChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Portfolio Value ($)",
          data: values,
          borderColor: "#365df0",
          backgroundColor: "rgba(54, 93, 240, 0.2)",
          fill: true,
          tension: 0.25,
        },
      ],
    },
    options: {
      scales: {
        y: {
          ticks: {
            callback: (value) => `$${value}`,
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
  const palette = [
    "#365df0",
    "#2db87d",
    "#f9a826",
    "#8f5af0",
    "#e64980",
    "#00a8cc",
    "#ff6b6b",
    "#4dabf7",
  ];

  return Array.from({ length }, (_, index) => palette[index % palette.length]);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(value);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

persistAndRender();
