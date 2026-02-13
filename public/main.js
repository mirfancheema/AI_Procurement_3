const app = {
  data: {
    suppliers: [
      { id: "BP-101", name: "GreenHarvest Traders", email: "orders@greenharvest.mock" },
      { id: "BP-224", name: "Metro Ingredients", email: "sales@metro.mock" },
      { id: "BP-339", name: "Panasia Agro", email: "cs@panasia.mock" }
    ],
    riskItems: [
      { sku: "TP-500", velocity: 42, stock: 126, forecast: 1290, unitCost: 2.3 },
      { sku: "OO-1L", velocity: 29, stock: 95, forecast: 910, unitCost: 6.4 },
      { sku: "PN-5KG", velocity: 20, stock: 118, forecast: 640, unitCost: 4.8 }
    ],
    pr: {
      prNumber: null,
      supplierId: "BP-101",
      sku: "TP-500",
      quantity: 1200,
      reviewedQty: 1200,
      currency: "USD",
      quoteUnitPrice: null,
      signedOff: false,
      canceled: false
    },
    prRecords: [],
    approval: {
      role: "manager",
      variance: 6.4,
      status: "not_started",
      pendingApprovals: [],
      selectedPendingIds: [],
      approvedPRs: [],
      signedOffPRs: []
    },
    supplierAI: {
      summary: "No incoming supplier response yet.",
      sentiment: "Neutral",
      priority: "Medium",
      humanOverride: false,
      approvedPO: null
    },
    delivery: {
      synced: false,
      eta: "2026-02-18",
      delivered: "-",
      grnQty: null,
      quality: "pass"
    },
    payment: {
      invoiceQty: 1180,
      matchStatus: "not_run",
      paymentStatus: "not_run"
    },
    score: {
      total: null,
      rating: null,
      action: null
    },
    auditTrail: []
  },

  els: {},

  init() {
    this.cacheEls();
    this.mountNavigation();
    this.seedSuppliers();
    this.seedSkus();
    this.renderRiskTable();
    this.refreshPrEstimatedAmount();
    this.refreshSignedOffPrsView();
    this.refreshPendingApprovalsView();
    this.refreshApprovedPrsView();
    this.bindActions();
    this.log("SESSION_STARTED", "OrderPilot POC initialized with isolated client mock data.");
    this.log("AI_POLICY", "All outbound supplier emails include AI disclosure tag.");
  },

  cacheEls() {
    const byId = (id) => document.getElementById(id);

    this.els = {
      riskTable: byId("risk-table"),
      demandTotal: byId("demand-total"),
      safetyStock: byId("safety-stock"),
      budgetDraw: byId("budget-draw"),
      cashflow: byId("cashflow"),
      skuForecastTable: byId("sku-forecast-table"),
      prNumber: byId("pr-number"),
      prSupplier: byId("pr-supplier"),
      prSku: byId("pr-sku"),
      prCurrency: byId("pr-currency"),
      prQty: byId("pr-qty"),
      draftUnitPrice: byId("draft-unit-price"),
      reviewedUnitPrice: byId("reviewed-unit-price"),
      prEstimatedAmount: byId("pr-est-amount"),
      prQuotedAmount: byId("pr-quoted-amount"),
      reviewQty: byId("review-qty"),
      prEmailStatus: byId("pr-email-status"),
      signedoffPrsBody: byId("signedoff-prs-body"),
      signedoffPrsTable: byId("signedoff-prs-table"),
      signedoffPrsEmpty: byId("signedoff-prs-empty"),
      approvalPrSelect: byId("approval-pr-select"),
      role: byId("role"),
      variance: byId("variance"),
      approvalOutcome: byId("approval-outcome"),
      pendingApprovalsBody: byId("pending-approvals-body"),
      pendingApprovalsTable: byId("pending-approvals-table"),
      pendingApprovalsEmpty: byId("pending-approvals-empty"),
      btnApproveSelected: byId("btn-approve-selected"),
      approvedPrsBody: byId("approved-prs-body"),
      approvedPrsTable: byId("approved-prs-table"),
      approvedPrsEmpty: byId("approved-prs-empty"),
      approvedPrSelect: byId("approved-pr-select"),
      commsSummary: byId("comms-summary"),
      commsSentiment: byId("comms-sentiment"),
      commsPriority: byId("comms-priority"),
      poDetails: byId("po-details"),
      deliverySync: byId("delivery-sync-status"),
      grnQty: byId("grn-quantity"),
      grnQuality: byId("grn-quality"),
      grnStatus: byId("grn-status"),
      grnQtyView: byId("grn-qty-view"),
      poQty: byId("po-qty"),
      invoiceQty: byId("invoice-qty"),
      matchStatus: byId("match-status"),
      payStatus: byId("pay-status"),
      scoreTotal: byId("score-total"),
      scoreRating: byId("score-rating"),
      scoreAction: byId("score-action"),
      auditLog: byId("audit-log")
    };
  },

  mountNavigation() {
    const links = [...document.querySelectorAll(".step-link")];
    const panels = [...document.querySelectorAll(".panel")];

    links.forEach((link) => {
      link.addEventListener("click", () => {
        links.forEach((l) => l.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));

        link.classList.add("active");
        document.getElementById(`panel-${link.dataset.target}`).classList.add("active");
      });
    });
  },

  seedSuppliers() {
    this.els.prSupplier.innerHTML = this.data.suppliers
      .map((s) => `<option value="${s.id}">${s.name} (${s.email})</option>`)
      .join("");
  },

  seedSkus() {
    this.els.prSku.innerHTML = this.data.riskItems
      .map((item) => `<option value="${item.sku}">${item.sku}</option>`)
      .join("");
  },

  createPrNumber() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `PR-${y}${m}${day}-${suffix}`;
  },

  computeGrossAmount(qty, unitPrice, gstPct = 7) {
    const subtotal = qty * unitPrice;
    return subtotal * (1 + gstPct / 100);
  },

  refreshPrEstimatedAmount() {
    const qty = Number(this.els.prQty.value) || 0;
    const draftUnitPrice = 2.3;
    const amount = this.computeGrossAmount(qty, draftUnitPrice, 7);
    this.els.draftUnitPrice.textContent = `$${draftUnitPrice.toFixed(2)}`;
    this.els.prEstimatedAmount.textContent = `$${amount.toFixed(2)}`;
  },

  formatRoleLabel(role) {
    return role === "director" ? "Company Director" : "Purchase Manager";
  },

  getPrRecord(prNumber) {
    return this.data.prRecords.find((item) => item.prNumber === prNumber) || null;
  },

  upsertPrRecord(record) {
    const index = this.data.prRecords.findIndex((item) => item.prNumber === record.prNumber);
    if (index >= 0) {
      this.data.prRecords[index] = { ...this.data.prRecords[index], ...record };
      return;
    }
    this.data.prRecords.unshift(record);
  },

  upsertSignedOffPr(record) {
    const index = this.data.approval.signedOffPRs.findIndex((item) => item.prNumber === record.prNumber);
    if (index >= 0) {
      this.data.approval.signedOffPRs[index] = {
        ...this.data.approval.signedOffPRs[index],
        ...record
      };
      return;
    }
    this.data.approval.signedOffPRs.unshift(record);
  },

  removeSignedOffPr(prNumber) {
    this.data.approval.signedOffPRs = this.data.approval.signedOffPRs.filter((item) => item.prNumber !== prNumber);
  },

  getSignedOffPrs() {
    return [...this.data.approval.signedOffPRs].sort(
      (a, b) => new Date(b.signedOffAt).getTime() - new Date(a.signedOffAt).getTime()
    );
  },

  refreshSignedOffPrsView() {
    const signedOffPrs = this.getSignedOffPrs();
    this.els.signedoffPrsBody.innerHTML = signedOffPrs
      .map((item) => `<tr>
        <td>${item.prNumber}</td>
        <td>${item.sku}</td>
        <td>${item.quantity}</td>
        <td>${item.supplierName}</td>
        <td>${item.signedOffAt ? new Date(item.signedOffAt).toLocaleString() : "-"}</td>
      </tr>`)
      .join("");

    const currentSelection = this.els.approvalPrSelect.value;
    const options = [
      `<option value="">Select a signed-off PR</option>`,
      ...signedOffPrs.map((item) => `<option value="${item.prNumber}">${item.prNumber} | ${item.sku} | ${item.quantity}</option>`)
    ];
    this.els.approvalPrSelect.innerHTML = options.join("");

    if (currentSelection && signedOffPrs.some((item) => item.prNumber === currentSelection)) {
      this.els.approvalPrSelect.value = currentSelection;
    }

    this.els.signedoffPrsTable.style.display = signedOffPrs.length ? "table" : "none";
    this.els.signedoffPrsEmpty.style.display = signedOffPrs.length ? "none" : "block";
  },

  getSelectedSignedOffPr() {
    const selectedPrNumber = this.els.approvalPrSelect.value;
    if (!selectedPrNumber) return null;
    const record = this.getSignedOffPrs().find((item) => item.prNumber === selectedPrNumber) || null;
    if (!record) return null;
    return record;
  },

  getPendingApprovals() {
    return this.data.approval.pendingApprovals.filter((item) => item.status === "pending");
  },

  getApprovedPrs() {
    return [...this.data.approval.approvedPRs].sort((a, b) => b.approvedAt.localeCompare(a.approvedAt));
  },

  refreshPendingApprovalsView() {
    const pending = this.getPendingApprovals();
    this.els.pendingApprovalsBody.innerHTML = pending
      .map((item) => {
        const checked = this.data.approval.selectedPendingIds.includes(item.id) ? "checked" : "";
        return `<tr>
          <td><input type="checkbox" class="pending-approval-checkbox" data-id="${item.id}" ${checked}></td>
          <td>${item.prNumber}</td>
          <td>${item.sku}</td>
          <td>${item.quantity}</td>
          <td>${item.supplierName}</td>
          <td>${item.variance.toFixed(2)}%</td>
          <td>${new Date(item.requestedAt).toLocaleString()}</td>
        </tr>`;
      })
      .join("");

    this.els.pendingApprovalsTable.style.display = pending.length ? "table" : "none";
    this.els.pendingApprovalsEmpty.style.display = pending.length ? "none" : "block";
    this.els.btnApproveSelected.disabled = this.data.approval.selectedPendingIds.length === 0;
  },

  refreshApprovedPrsView() {
    const approved = this.getApprovedPrs();
    this.els.approvedPrsBody.innerHTML = approved
      .map((item) => `<tr>
        <td>${item.prNumber}</td>
        <td>${item.sku}</td>
        <td>${item.quantity}</td>
        <td>${item.supplierName}</td>
        <td>${item.approvalStatusText}</td>
      </tr>`)
      .join("");

    const currentSelection = this.els.approvedPrSelect.value;
    const options = [
      `<option value="">Select an approved PR</option>`,
      ...approved.map((item) => `<option value="${item.prNumber}">${item.prNumber} | ${item.sku} | ${item.quantity}</option>`)
    ];
    this.els.approvedPrSelect.innerHTML = options.join("");

    if (currentSelection && approved.some((item) => item.prNumber === currentSelection)) {
      this.els.approvedPrSelect.value = currentSelection;
    }

    this.els.approvedPrsTable.style.display = approved.length ? "table" : "none";
    this.els.approvedPrsEmpty.style.display = approved.length ? "none" : "block";
  },

  upsertApprovedPr(item) {
    const index = this.data.approval.approvedPRs.findIndex((pr) => pr.prNumber === item.prNumber);
    if (index >= 0) {
      this.data.approval.approvedPRs[index] = { ...this.data.approval.approvedPRs[index], ...item };
      return;
    }
    this.data.approval.approvedPRs.unshift(item);
  },

  removeApprovedPr(prNumber) {
    this.data.approval.approvedPRs = this.data.approval.approvedPRs.filter((item) => item.prNumber !== prNumber);
  },

  buildApprovedPrFromRecord(prRecord, role, statusText) {
    return {
      prNumber: prRecord.prNumber,
      supplierId: prRecord.supplierId,
      supplierName: prRecord.supplierName,
      supplierEmail: prRecord.supplierEmail,
      sku: prRecord.sku,
      quantity: prRecord.quantity,
      currency: prRecord.currency,
      unitPrice: prRecord.quoteUnitPrice ?? 2.3,
      approvalStatusText: statusText,
      approvedBy: this.formatRoleLabel(role),
      approvedAt: new Date().toISOString()
    };
  },

  addOrUpdatePendingApproval(prRecord, role, variance, threshold) {
    const pendingItem = {
      id: `APR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      prNumber: prRecord.prNumber,
      supplierId: prRecord.supplierId,
      sku: prRecord.sku,
      quantity: prRecord.quantity,
      supplierName: prRecord.supplierName,
      supplierEmail: prRecord.supplierEmail,
      currency: prRecord.currency,
      unitPrice: prRecord.quoteUnitPrice ?? 2.3,
      variance,
      threshold,
      requestedRole: role,
      requestedAt: new Date().toISOString(),
      status: "pending",
      approvedBy: null,
      approvedAt: null
    };

    const index = this.data.approval.pendingApprovals.findIndex(
      (item) => item.prNumber === prRecord.prNumber && item.status === "pending"
    );

    if (index >= 0) {
      this.data.approval.pendingApprovals[index] = {
        ...this.data.approval.pendingApprovals[index],
        ...pendingItem,
        id: this.data.approval.pendingApprovals[index].id
      };
      return;
    }

    this.data.approval.pendingApprovals.unshift(pendingItem);
  },

  approveSelectedPendingApprovals() {
    const selected = this.data.approval.selectedPendingIds;
    if (!selected.length) {
      this.els.approvalOutcome.textContent = "Select at least one pending approval first.";
      this.log("APPROVAL_SELECTION_REQUIRED", "Approve action blocked because no pending approvals were selected.");
      return;
    }

    const approverRole = this.els.role.value;
    const now = new Date().toISOString();
    let approvedCount = 0;

    this.data.approval.pendingApprovals = this.data.approval.pendingApprovals.map((item) => {
      if (!selected.includes(item.id) || item.status !== "pending") return item;
      approvedCount += 1;
      this.upsertApprovedPr({
        prNumber: item.prNumber,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        supplierEmail: item.supplierEmail,
        sku: item.sku,
        quantity: item.quantity,
        currency: item.currency,
        unitPrice: item.unitPrice,
        approvalStatusText: "Approved (multi-level)",
        approvedBy: this.formatRoleLabel(approverRole),
        approvedAt: now
      });
      return {
        ...item,
        status: "approved",
        approvedBy: approverRole,
        approvedAt: now
      };
    });

    this.data.approval.selectedPendingIds = [];
    if (approvedCount > 0) this.data.approval.status = "approved_multilevel";
    this.els.approvalOutcome.textContent = `Approved ${approvedCount} pending approval${approvedCount === 1 ? "" : "s"} as ${this.formatRoleLabel(approverRole)}.`;
    this.refreshPendingApprovalsView();
    this.refreshApprovedPrsView();
    this.log("PENDING_APPROVALS_APPROVED", this.els.approvalOutcome.textContent);
  },

  renderRiskTable() {
    const rows = this.data.riskItems.map((item) => {
      const daysCover = (item.stock / item.velocity).toFixed(1);
      return `<tr><td>${item.sku}</td><td>${item.velocity}</td><td>${item.stock}</td><td>${daysCover}</td><td>${item.forecast}</td></tr>`;
    });

    this.els.riskTable.innerHTML = rows.join("");

    const totalDemand = this.data.riskItems.reduce((sum, i) => sum + i.forecast, 0);
    const safetyStock = Math.round(this.data.riskItems.reduce((sum, i) => sum + i.velocity * 4, 0));
    const budget = this.data.riskItems.reduce((sum, i) => sum + i.forecast * i.unitCost, 0);

    this.els.demandTotal.textContent = `${totalDemand.toLocaleString()} units`;
    this.els.safetyStock.textContent = `${safetyStock.toLocaleString()} units`;
    this.els.budgetDraw.textContent = `$${Math.round(budget).toLocaleString()}`;
    this.els.cashflow.textContent = budget > 9000 ? "High (next 3 weeks)" : "Moderate";

    const skuRows = this.data.riskItems.map((item) => {
      const forecast7 = Math.round(item.forecast * 0.24);
      const forecast14 = Math.round(item.forecast * 0.47);
      const reorderPoint = Math.ceil(item.velocity * 7);
      const suggestedReorderQty = Math.max(item.forecast + reorderPoint - item.stock, 0);

      return `<tr>
        <td>${item.sku}</td>
        <td>${forecast7}</td>
        <td>${forecast14}</td>
        <td>${item.forecast}</td>
        <td>${reorderPoint}</td>
        <td>${suggestedReorderQty}</td>
      </tr>`;
    });

    this.els.skuForecastTable.innerHTML = skuRows.join("");
  },

  bindActions() {
    document.getElementById("btn-refresh-forecast").addEventListener("click", () => {
      this.data.riskItems = this.data.riskItems.map((i) => ({
        ...i,
        forecast: Math.round(i.forecast * (1 + (Math.random() * 0.08 - 0.03)))
      }));
      this.renderRiskTable();
      this.log("FORECAST_REFRESH", "Recomputed demand with seasonality, low-stock prioritization, and SKU-level forecast.");
    });

    document.getElementById("btn-request-price").addEventListener("click", () => {
      const qty = Number(this.els.prQty.value);
      if (!Number.isFinite(qty) || qty <= 0) {
        this.els.prEmailStatus.textContent = "Price request blocked: quantity must be greater than zero.";
        this.log("PRICE_REQUEST_BLOCKED", "Invalid PR quantity.");
        return;
      }
      const prNumber = this.createPrNumber();
      const supplier = this.data.suppliers.find((s) => s.id === this.els.prSupplier.value);
      this.data.pr.prNumber = prNumber;
      this.data.pr.supplierId = this.els.prSupplier.value;
      this.data.pr.sku = this.els.prSku.value;
      this.data.pr.quantity = qty;
      this.data.pr.currency = this.els.prCurrency.value;
      this.data.pr.canceled = false;
      this.data.pr.signedOff = false;
      this.data.pr.quoteUnitPrice = Number((2.25 + Math.random() * 0.3).toFixed(2));
      this.data.approval.status = "not_started";
      this.data.approval.selectedPendingIds = [];
      this.els.prNumber.textContent = prNumber;
      this.els.reviewedUnitPrice.textContent = `$${this.data.pr.quoteUnitPrice.toFixed(2)}`;
      const quotedAmount = this.computeGrossAmount(qty, this.data.pr.quoteUnitPrice, 7);
      this.els.prQuotedAmount.textContent = `$${quotedAmount.toFixed(2)}`;

      const variance = (((this.data.pr.quoteUnitPrice - 2.3) / 2.3) * 100).toFixed(2);
      this.els.prEmailStatus.textContent = `Supplier quote parsed for ${this.data.pr.sku}: ${this.data.pr.currency} ${this.data.pr.quoteUnitPrice}/unit (${variance}% vs baseline).`;
      this.upsertPrRecord({
        prNumber,
        supplierId: this.data.pr.supplierId,
        supplierName: supplier ? supplier.name : "Unknown Supplier",
        supplierEmail: supplier ? supplier.email : "-",
        sku: this.data.pr.sku,
        quantity: this.data.pr.quantity,
        currency: this.data.pr.currency,
        quoteUnitPrice: this.data.pr.quoteUnitPrice,
        signedOff: false,
        signedOffAt: null,
        canceled: false,
        createdAt: new Date().toISOString()
      });

      this.log("PRICE_REQUEST_SENT", `Created ${prNumber} for ${this.data.pr.sku}; sent AI-disclosed quote request for qty ${qty} to ${this.data.pr.supplierId}.`);
      this.log("SUPPLIER_QUOTE_PARSED", this.els.prEmailStatus.textContent);
      this.refreshSignedOffPrsView();
      this.refreshPendingApprovalsView();
      this.els.approvalPrSelect.value = prNumber;
    });

    this.els.prQty.addEventListener("input", () => {
      this.refreshPrEstimatedAmount();
    });

    document.getElementById("btn-pr-cancel").addEventListener("click", () => {
      const currentPrNumber = this.data.pr.prNumber;
      this.data.pr.canceled = true;
      this.data.pr.signedOff = false;
      if (currentPrNumber) {
        this.upsertPrRecord({
          prNumber: currentPrNumber,
          canceled: true,
          signedOff: false
        });
        this.removeApprovedPr(currentPrNumber);
        this.removeSignedOffPr(currentPrNumber);
      }
      this.data.approval.pendingApprovals = this.data.approval.pendingApprovals.filter(
        (item) => item.prNumber !== currentPrNumber
      );
      this.data.approval.selectedPendingIds = [];
      this.data.approval.status = "not_started";
      this.els.reviewedUnitPrice.textContent = "-";
      this.els.prQuotedAmount.textContent = "$0.00";
      this.els.prEmailStatus.textContent = "PR canceled by human reviewer.";
      this.refreshSignedOffPrsView();
      this.refreshPendingApprovalsView();
      this.refreshApprovedPrsView();
      this.log("PR_CANCELED", "Human canceled PR during pricing review stage.");
    });

    document.getElementById("btn-pr-signoff").addEventListener("click", () => {
      if (!this.data.pr.prNumber) {
        this.els.prEmailStatus.textContent = "Sign-off blocked: generate PR and parse quote first.";
        this.log("PR_SIGNOFF_BLOCKED", "Sign-off attempted without PR generation.");
        return;
      }
      if (this.data.pr.canceled || this.data.pr.quoteUnitPrice === null) {
        this.els.prEmailStatus.textContent = "Sign-off blocked: quote parsing required and PR must be active.";
        this.log("PR_SIGNOFF_BLOCKED", "Missing parsed quote or PR canceled.");
        return;
      }

      const reviewedQty = Number(this.els.reviewQty.value);
      if (!Number.isFinite(reviewedQty) || reviewedQty <= 0) {
        this.els.prEmailStatus.textContent = "Sign-off blocked: reviewed quantity must be greater than zero.";
        this.log("PR_SIGNOFF_BLOCKED", "Invalid reviewed quantity.");
        return;
      }

      this.data.pr.reviewedQty = reviewedQty;
      this.data.pr.signedOff = true;
      this.els.prQty.value = String(this.data.pr.reviewedQty);
      this.refreshPrEstimatedAmount();
      this.upsertPrRecord({
        prNumber: this.data.pr.prNumber,
        supplierId: this.data.pr.supplierId,
        supplierName: this.data.suppliers.find((s) => s.id === this.data.pr.supplierId)?.name || "Unknown Supplier",
        supplierEmail: this.data.suppliers.find((s) => s.id === this.data.pr.supplierId)?.email || "-",
        sku: this.data.pr.sku,
        quantity: this.data.pr.reviewedQty,
        currency: this.data.pr.currency,
        quoteUnitPrice: this.data.pr.quoteUnitPrice,
        signedOff: true,
        canceled: false,
        signedOffAt: new Date().toISOString()
      });
      this.upsertSignedOffPr({
        prNumber: this.data.pr.prNumber,
        supplierId: this.data.pr.supplierId,
        supplierName: this.data.suppliers.find((s) => s.id === this.data.pr.supplierId)?.name || "Unknown Supplier",
        supplierEmail: this.data.suppliers.find((s) => s.id === this.data.pr.supplierId)?.email || "-",
        sku: this.data.pr.sku,
        quantity: this.data.pr.reviewedQty,
        currency: this.data.pr.currency,
        quoteUnitPrice: this.data.pr.quoteUnitPrice ?? 2.3,
        signedOffAt: new Date().toISOString()
      });
      this.els.prEmailStatus.textContent = `Human sign-off completed. Final quantity: ${this.data.pr.reviewedQty}.`;
      this.refreshSignedOffPrsView();
      this.els.approvalPrSelect.value = this.data.pr.prNumber;
      this.log("PR_SIGNED_OFF", "Mandatory human sign-off completed.");
    });

    document.getElementById("btn-route").addEventListener("click", () => {
      const selectedPr = this.getSelectedSignedOffPr();
      if (!selectedPr) {
        this.els.approvalOutcome.textContent = "Routing blocked: select a signed-off PR first.";
        this.log("APPROVAL_BLOCKED", "Approval attempted without selecting a signed-off PR.");
        return;
      }

      const role = this.els.role.value;
      const variance = Number(this.els.variance.value);
      if (!Number.isFinite(variance) || variance < 0) {
        this.els.approvalOutcome.textContent = "Routing blocked: variance must be zero or higher.";
        this.log("APPROVAL_BLOCKED", "Invalid variance.");
        return;
      }
      const threshold = role === "manager" ? 5 : 20;

      this.data.approval.role = role;
      this.data.approval.variance = variance;
      this.data.approval.status = variance <= threshold ? "auto_convert_po" : "needs_multilevel";

      if (variance <= threshold) {
        this.els.approvalOutcome.textContent = `${selectedPr.prNumber}: within threshold (${variance}% <= ${threshold}%). PR approved.`;
        this.upsertApprovedPr(this.buildApprovedPrFromRecord(selectedPr, role, "Approved (within threshold)"));
        this.data.approval.pendingApprovals = this.data.approval.pendingApprovals.filter(
          (item) => item.prNumber !== selectedPr.prNumber || item.status === "approved"
        );
        this.data.approval.selectedPendingIds = [];
      } else {
        this.removeApprovedPr(selectedPr.prNumber);
        this.addOrUpdatePendingApproval(selectedPr, role, variance, threshold);
        this.els.approvalOutcome.textContent = `${selectedPr.prNumber}: exceeded threshold (${variance}% > ${threshold}%). Escalated to multi-level approval.`;
      }

      this.refreshPendingApprovalsView();
      this.refreshApprovedPrsView();
      this.log("APPROVAL_ROUTED", this.els.approvalOutcome.textContent);
    });

    this.els.pendingApprovalsBody.addEventListener("change", (event) => {
      const target = event.target;
      if (!target.classList.contains("pending-approval-checkbox")) return;

      const itemId = target.dataset.id;
      const selected = new Set(this.data.approval.selectedPendingIds);
      if (target.checked) selected.add(itemId);
      else selected.delete(itemId);
      this.data.approval.selectedPendingIds = [...selected];
      this.els.btnApproveSelected.disabled = this.data.approval.selectedPendingIds.length === 0;
    });

    this.els.btnApproveSelected.addEventListener("click", () => {
      this.approveSelectedPendingApprovals();
    });

    document.getElementById("btn-send-po").addEventListener("click", () => {
      const selectedPrNumber = this.els.approvedPrSelect.value;
      if (!selectedPrNumber) {
        this.data.supplierAI.summary = "PO dispatch blocked: select an approved PR first.";
        this.refreshCommsView();
        this.log("PO_BLOCKED", this.data.supplierAI.summary);
        return;
      }
      const selectedApprovedPr = this.data.approval.approvedPRs.find((item) => item.prNumber === selectedPrNumber);
      if (!selectedApprovedPr) {
        this.data.supplierAI.summary = "PO dispatch blocked: selected PR is not in approved queue.";
        this.refreshCommsView();
        this.log("PO_BLOCKED", this.data.supplierAI.summary);
        return;
      }

      const now = new Date().toISOString();
      const poNumber = `PO-${now.slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      const qty = Number(selectedApprovedPr.quantity);
      const unitPrice = Number(selectedApprovedPr.unitPrice);
      const amount = this.computeGrossAmount(qty, unitPrice, 7);
      const approvalStatus = selectedApprovedPr.approvalStatusText;

      this.data.supplierAI.approvedPO = {
        poNumber,
        prNumber: selectedApprovedPr.prNumber,
        supplier: selectedApprovedPr.supplierName,
        supplierEmail: selectedApprovedPr.supplierEmail,
        sku: selectedApprovedPr.sku,
        quantity: qty,
        unitPrice,
        amount,
        approvalStatus,
        sentAt: now,
        aiDisclosure: "AI_AGENT_DISCLOSURE: This message was generated by OrderPilot AI Procurement Agent."
      };

      this.data.supplierAI.summary = "PO email sent with AI disclosure tag. Acknowledgement requested from supplier.";
      this.data.supplierAI.sentiment = "Positive";
      this.data.supplierAI.priority = "Medium";
      this.data.payment.matchStatus = "not_run";
      this.data.payment.paymentStatus = "not_run";
      this.data.delivery.synced = false;
      this.data.delivery.delivered = "-";
      this.data.delivery.grnQty = null;
      this.els.poQty.textContent = String(qty);
      this.els.grnQtyView.textContent = "-";
      this.els.grnQty.value = String(qty);
      this.els.matchStatus.textContent = "Match not run.";
      this.els.payStatus.textContent = "Payment not executed.";
      this.els.grnStatus.textContent = "No GRN entered yet.";
      this.els.deliverySync.textContent = "Periodic sync not run.";
      this.refreshCommsView();
      this.els.poDetails.innerHTML = this.formatApprovedPoDetails();
      this.log("PO_DISPATCHED", "AI agent dispatched PO by email with disclosure header.");
    });

    document.getElementById("btn-remind").addEventListener("click", () => {
      if (!this.getActivePo()) {
        this.data.supplierAI.summary = "Reminder blocked: send approved PO first.";
        this.refreshCommsView();
        this.log("DELIVERY_REMINDER_BLOCKED", "Reminder attempted before PO dispatch.");
        return;
      }
      this.data.supplierAI.summary = "Reminder sent. AI follow-up schedule set for 24 hours.";
      this.data.supplierAI.sentiment = "Neutral";
      this.data.supplierAI.priority = "Medium";
      this.refreshCommsView();
      this.log("DELIVERY_REMINDER", "Sent delivery reminder and follow-up schedule.");
    });

    document.getElementById("btn-human-override").addEventListener("click", () => {
      this.data.supplierAI.humanOverride = true;
      this.data.supplierAI.summary = "Supplier requested human intervention for renegotiation.";
      this.data.supplierAI.sentiment = "Concerned";
      this.data.supplierAI.priority = "High";
      this.refreshCommsView();
      this.log("HUMAN_OVERRIDE_REQUEST", "Supplier requested handoff from AI to human buyer.");
    });

    document.getElementById("btn-sync-delivery").addEventListener("click", () => {
      if (!this.getActivePo()) {
        this.els.deliverySync.textContent = "Sync blocked: send approved PO before delivery tracking.";
        this.log("DELIVERY_SYNC_BLOCKED", "Delivery sync attempted before PO dispatch.");
        return;
      }
      this.data.delivery.synced = true;
      this.data.delivery.delivered = "2026-02-19";
      this.els.deliverySync.textContent = "Sync complete: partial delivery notice received, first tranche inbound.";
      this.log("DELIVERY_SYNC", "Supplier status synced through periodic polling.");
    });

    document.getElementById("btn-grn").addEventListener("click", () => {
      if (!this.getActivePo()) {
        this.els.grnStatus.textContent = "GRN blocked: send approved PO first.";
        this.log("GRN_BLOCKED", "GRN attempted before PO dispatch.");
        return;
      }
      const qty = Number(this.els.grnQty.value);
      if (!Number.isFinite(qty) || qty < 0) {
        this.els.grnStatus.textContent = "GRN blocked: quantity must be zero or higher.";
        this.log("GRN_BLOCKED", "Invalid GRN quantity.");
        return;
      }
      const quality = this.els.grnQuality.value;

      this.data.delivery.grnQty = qty;
      this.data.delivery.quality = quality;

      this.els.grnQtyView.textContent = String(qty);
      this.els.grnStatus.textContent = `GRN submitted: ${qty} units, quality ${quality}.`;

      this.log("GRN_SUBMITTED", this.els.grnStatus.textContent);
    });

    document.getElementById("btn-match").addEventListener("click", () => {
      const activePo = this.getActivePo();
      if (!activePo) {
        this.els.matchStatus.textContent = "3-way match blocked: PO not dispatched.";
        this.log("MATCH_BLOCKED", "3-way matching attempted before PO dispatch.");
        return;
      }
      const poQty = Number(activePo.quantity);
      const grnQty = this.data.delivery.grnQty;
      const invoiceQty = this.data.payment.invoiceQty;

      if (grnQty === null) {
        this.els.matchStatus.textContent = "3-way match blocked: GRN missing.";
        this.log("MATCH_BLOCKED", "3-way matching attempted before GRN.");
        return;
      }

      const isMatch = poQty === grnQty && grnQty === invoiceQty;
      this.data.payment.matchStatus = isMatch ? "pass" : "exception";
      this.els.matchStatus.textContent = isMatch
        ? "3-way match successful."
        : `Mismatch found. PO ${poQty}, GRN ${grnQty}, Invoice ${invoiceQty}.`;

      this.log("THREE_WAY_MATCH", this.els.matchStatus.textContent);
    });

    document.getElementById("btn-pay").addEventListener("click", () => {
      if (!this.getActivePo()) {
        this.els.payStatus.textContent = "Payment hold: PO not dispatched.";
        this.log("PAYMENT_HOLD", "Payment blocked because PO has not been dispatched.");
        return;
      }
      if (this.data.payment.matchStatus !== "pass") {
        this.els.payStatus.textContent = "Payment hold: resolve 3-way mismatch first.";
        this.log("PAYMENT_HOLD", "Payment blocked due to unresolved match exception.");
        return;
      }

      const reference = `BANK-${Math.floor(100000 + Math.random() * 900000)}`;
      this.data.payment.paymentStatus = "executed";
      this.els.payStatus.textContent = `Payment executed via banking API simulation. Ref ${reference}.`;
      this.log("PAYMENT_EXECUTED", this.els.payStatus.textContent);
    });

    document.getElementById("btn-score").addEventListener("click", () => {
      const total = Number((82 * 0.4 + 74 * 0.25 + 88 * 0.2 + 70 * 0.1 + 92 * 0.05).toFixed(1));
      let rating = "Needs Improvement";
      if (total >= 90) rating = "Excellent";
      else if (total >= 75) rating = "Good";
      else if (total >= 60) rating = "Satisfactory";

      const action = total < 60
        ? "Trigger supplier alert and recommend alternatives."
        : "Continue monthly trend reporting and monitoring.";

      this.data.score = { total, rating, action };
      this.els.scoreTotal.textContent = `Score: ${total}/100`;
      this.els.scoreRating.textContent = `Rating: ${rating}`;
      this.els.scoreAction.textContent = `Action: ${action}`;

      this.log("SUPPLIER_SCORED", `Performance ${total}/100 (${rating}).`);
    });

    document.querySelectorAll("[data-export]").forEach((button) => {
      button.addEventListener("click", () => {
        const lines = this.exportLines(button.dataset.export);
        this.downloadPdf(`orderpilot-${button.dataset.export}.pdf`, lines);
        this.log("ARTIFACT_EXPORTED", `${button.dataset.export} PDF artifact downloaded.`);
      });
    });
  },

  refreshCommsView() {
    this.els.commsSummary.textContent = this.data.supplierAI.summary;
    this.els.commsSentiment.textContent = `Sentiment: ${this.data.supplierAI.sentiment}`;
    this.els.commsPriority.textContent = `Priority: ${this.data.supplierAI.priority}`;
  },

  getActivePo() {
    return this.data.supplierAI.approvedPO;
  },

  formatApprovedPoDetails() {
    const po = this.data.supplierAI.approvedPO;
    if (!po) return "No PO dispatch record yet.";

    return [
      `PO Number: ${po.poNumber}`,
      `PR Number: ${po.prNumber}`,
      `Supplier: ${po.supplier}`,
      `Supplier Email: ${po.supplierEmail}`,
      `SKU: ${po.sku}`,
      `Quantity: ${po.quantity}`,
      `Unit Price (USD): $${po.unitPrice.toFixed(2)}`,
      `Amount (USD incl GST): $${po.amount.toFixed(2)}`,
      `Approval Status: ${po.approvalStatus}`,
      `Sent At: ${po.sentAt}`,
      `AI Disclosure Tag: ${po.aiDisclosure}`
    ].join("<br>");
  },

  log(event, detail) {
    const ts = new Date().toISOString();
    this.data.auditTrail.unshift({ ts, event, detail });
    this.data.auditTrail = this.data.auditTrail.slice(0, 100);

    this.els.auditLog.innerHTML = this.data.auditTrail
      .map((x) => `<div class="audit-row">[${x.ts}] ${x.event}: ${x.detail}</div>`)
      .join("");
  },

  exportLines(kind) {
    const lookup = {
      forecast: [
        "OrderPilot Forecast Artifact",
        `Timestamp: ${new Date().toISOString()}`,
        `Demand: ${this.els.demandTotal.textContent}`,
        `Safety stock: ${this.els.safetyStock.textContent}`,
        `Budget impact: ${this.els.budgetDraw.textContent}`,
        `Cashflow pressure: ${this.els.cashflow.textContent}`,
        ...this.data.riskItems.map((i) => {
          const reorderPoint = Math.ceil(i.velocity * 7);
          const suggestedReorderQty = Math.max(i.forecast + reorderPoint - i.stock, 0);
          return `${i.sku}: 30d ${i.forecast}, reorder point ${reorderPoint}, suggested reorder ${suggestedReorderQty}`;
        })
      ],
      pr: [
        "OrderPilot PR Artifact",
        `PR Number: ${this.data.pr.prNumber || "Not generated"}`,
        `SKU: ${this.data.pr.sku || "-"}`,
        `Supplier: ${this.els.prSupplier.options[this.els.prSupplier.selectedIndex]?.text || "-"}`,
        `Currency: ${this.els.prCurrency.value}`,
        `Quantity: ${this.els.prQty.value}`,
        `Draft Unit Price (USD): ${this.els.draftUnitPrice.textContent}`,
        `Reviewed Unit Price (USD): ${this.els.reviewedUnitPrice.textContent}`,
        `Estimated Amount (USD incl GST): ${this.els.prEstimatedAmount.textContent}`,
        `Quoted Amount (USD incl GST): ${this.els.prQuotedAmount.textContent}`,
        `Review state: ${this.data.pr.signedOff ? "Signed off" : "Pending"}`
      ],
      approval: [
        "OrderPilot Approval Artifact",
        `Selected PR: ${this.els.approvalPrSelect.value || "None"}`,
        `Role: ${this.els.role.value}`,
        `Variance: ${this.els.variance.value}%`,
        `Outcome: ${this.els.approvalOutcome.textContent}`,
        `Pending approvals: ${this.getPendingApprovals().length}`
      ],
      supplier: [
        "OrderPilot Supplier Comms Artifact",
        this.els.commsSummary.textContent,
        this.els.commsSentiment.textContent,
        this.els.commsPriority.textContent,
        this.data.supplierAI.approvedPO
          ? `PO Number: ${this.data.supplierAI.approvedPO.poNumber}`
          : "PO Number: Not sent",
        this.data.supplierAI.approvedPO
          ? `PR Number: ${this.data.supplierAI.approvedPO.prNumber}`
          : "PR Number: Not available",
        this.data.supplierAI.approvedPO
          ? `SKU: ${this.data.supplierAI.approvedPO.sku}, Qty: ${this.data.supplierAI.approvedPO.quantity}, Unit: $${this.data.supplierAI.approvedPO.unitPrice.toFixed(2)}`
          : "PO line: Not available"
      ],
      delivery: [
        "OrderPilot Delivery Artifact",
        this.els.deliverySync.textContent,
        this.els.grnStatus.textContent
      ],
      payment: [
        "OrderPilot Payment Artifact",
        this.els.matchStatus.textContent,
        this.els.payStatus.textContent
      ],
      score: [
        "OrderPilot Supplier Score Artifact",
        this.els.scoreTotal.textContent,
        this.els.scoreRating.textContent,
        this.els.scoreAction.textContent
      ],
      audit: [
        "OrderPilot KPI + Audit Artifact",
        ...[...document.querySelectorAll("#kpi-list li")].map((li) => li.textContent),
        "Recent events:",
        ...this.data.auditTrail.slice(0, 6).map((x) => `${x.ts} ${x.event}`)
      ]
    };

    return lookup[kind] || ["OrderPilot Artifact", "No content"]; 
  },

  escapePdfText(text) {
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  },

  downloadPdf(filename, lines) {
    const stream = ["BT", "/F1 11 Tf", "50 790 Td"];

    lines.forEach((line, idx) => {
      if (idx > 0) stream.push("0 -17 Td");
      stream.push(`(${this.escapePdfText(line)}) Tj`);
    });

    stream.push("ET");
    const content = stream.join("\n");

    const objects = [
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj",
      `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
      "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objects.forEach((obj) => {
      offsets.push(pdf.length);
      pdf += `${obj}\n`;
    });

    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i < offsets.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
};

app.init();
