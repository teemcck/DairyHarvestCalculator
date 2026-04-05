(function () {
  "use strict";

  const form = document.getElementById("dairy-form");
  const timestampInput = document.getElementById("timestamp");
  const resultsSection = document.getElementById("results-section");
  const summaryTable = document.getElementById("summary-table");
  const tableBody = summaryTable.querySelector("tbody");
  const exportTarget = document.getElementById("export-target");
  const btnPdf = document.getElementById("btn-pdf");
  const btnPng = document.getElementById("btn-png");

  function localDateYYYYMMDD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function formatLocalTimestamp(d) {
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
  }

  function refreshTimestamp() {
    timestampInput.value = formatLocalTimestamp(new Date());
  }

  refreshTimestamp();
  setInterval(refreshTimestamp, 1000);

  const dateInput = document.getElementById("recordDate");
  if (!dateInput.value) {
    dateInput.value = localDateYYYYMMDD(new Date());
  }

  function getNum(id) {
    const el = document.getElementById(id);
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? v : NaN;
  }

  function getStr(id) {
    return document.getElementById(id).value.trim();
  }

  function computePackingWeightPerTonPerHour(packingTractors, trucksPerHour, avgTonsPerLoad) {
    const denom = trucksPerHour * avgTonsPerLoad;
    if (!Number.isFinite(packingTractors) || !Number.isFinite(denom) || denom <= 0) {
      return null;
    }
    return Math.round((packingTractors * 60000) / denom);
  }

  function displayCell(value) {
    return value === "" || value == null ? "—" : String(value);
  }

  function summaryRow(label, value) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.className = "summary-table__label";
    th.textContent = label;
    const td = document.createElement("td");
    td.className = "summary-table__value";
    td.textContent = displayCell(value);
    tr.appendChild(th);
    tr.appendChild(td);
    return tr;
  }

  function renderSummaryTable(fieldRows) {
    tableBody.innerHTML = "";
    for (var i = 0; i < fieldRows.length; i++) {
      const item = fieldRows[i];
      tableBody.appendChild(summaryRow(item[0], item[1]));
    }
  }

  form.addEventListener("reset", function () {
    resultsSection.classList.add("hidden");
    tableBody.innerHTML = "";
    setTimeout(function () {
      refreshTimestamp();
      dateInput.value = localDateYYYYMMDD(new Date());
    }, 0);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const avgTons = getNum("avgTonsPerLoad");
    const trucksPerHour = getNum("trucksPerHour");
    const packingTractors = getNum("packingTractors");

    const packingWeight = computePackingWeightPerTonPerHour(
      packingTractors,
      trucksPerHour,
      avgTons
    );

    const rows = [
      ["Entry Timestamp", timestampInput.value],
      ["Email address", getStr("email")],
      ["Farm name", getStr("farmName")],
      ["Date", getStr("recordDate")],
      ["Field name", getStr("fieldName")],
      ["Truck 1 fill time", getStr("truck1Fill")],
      ["Truck 2 fill time", getStr("truck2Fill")],
      ["Average tons of silage per truck load", avgTons],
      ["Other field notes", getStr("fieldNotes")],
      ["Silage pile name or location", getStr("pileLocation")],
      ["Trucks delivered to pile per hour", trucksPerHour],
      ["Number of packing tractors", packingTractors],
      ["Other notes about the silage pile", getStr("pileNotes")],
      [
        "Packing weight per ton, per hour",
        packingWeight == null
          ? "Cannot compute (need trucks/hour > 0 and avg tons/load > 0)"
          : packingWeight,
      ],
    ];

    renderSummaryTable(rows);

    resultsSection.classList.remove("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  function safeFilename(base) {
    const d = new Date();
    const stamp =
      localDateYYYYMMDD(d) +
      "T" +
      String(d.getHours()).padStart(2, "0") +
      "-" +
      String(d.getMinutes()).padStart(2, "0") +
      "-" +
      String(d.getSeconds()).padStart(2, "0");
    return base + "-" + stamp;
  }

  function captureExportTarget() {
    if (typeof html2canvas !== "function") {
      alert("Image/PDF export library failed to load. Check your network and refresh.");
      return Promise.reject(new Error("html2canvas missing"));
    }
    return html2canvas(exportTarget, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
  }

  btnPng.addEventListener("click", function () {
    if (resultsSection.classList.contains("hidden")) {
      return;
    }
    captureExportTarget()
      .then(function (canvas) {
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = safeFilename("silage-diary") + ".png";
        a.click();
      })
      .catch(function () {});
  });

  btnPdf.addEventListener("click", function () {
    if (resultsSection.classList.contains("hidden")) {
      return;
    }
    const jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) {
      alert("PDF library failed to load. Check your network and refresh.");
      return;
    }
    captureExportTarget()
      .then(function (canvas) {
        const imgData = canvas.toDataURL("image/png");
        const pdfW = canvas.width;
        const pdfH = canvas.height;
        const orientation = pdfH >= pdfW ? "p" : "l";
        const pdf = new jsPDF({
          orientation: orientation,
          unit: "px",
          format: [pdfW, pdfH],
        });
        pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
        pdf.save(safeFilename("silage-diary") + ".pdf");
      })
      .catch(function () {});
  });
})();
