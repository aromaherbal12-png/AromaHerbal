// Frontend-only sample data for the Aroma manufacturing workflow.
export const factorySeed = {
  inventory: [
    { id: "RM-1042", name: "Aloe vera extract", category: "Raw material", lot: "AV-2609-18", stock: 42, unit: "kg", minimum: 25, location: "RM · A-04", supplier: "Greenleaf Botanicals", status: "In stock" },
    { id: "RM-1038", name: "Coconut oil, cold pressed", category: "Raw material", lot: "CO-2609-06", stock: 18, unit: "L", minimum: 20, location: "RM · A-02", supplier: "Deccan Naturals", status: "Low stock" },
    { id: "PM-2041", name: "Amber glass bottle · 100 ml", category: "Packaging", lot: "AG-2609-11", stock: 1240, unit: "pcs", minimum: 500, location: "PK · B-01", supplier: "Glassline India", status: "In stock" },
    { id: "RM-1051", name: "Bhringraj leaf powder", category: "Raw material", lot: "BR-2609-03", stock: 8, unit: "kg", minimum: 15, location: "RM · A-07", supplier: "HerbSource Co.", status: "Low stock" },
    { id: "FG-3012", name: "Triple P.V. Hair Oil · 100 ml", category: "Finished goods", lot: "PV-2610-02", stock: 860, unit: "pcs", minimum: 300, location: "FG · C-03", supplier: "—", status: "In stock" },
    { id: "PM-2054", name: "Printed carton · Hair Oil", category: "Packaging", lot: "CT-2609-09", stock: 90, unit: "pcs", minimum: 200, location: "PK · B-05", supplier: "Packwell Industries", status: "Low stock" },
    { id: "FG-3024", name: "Sahanchara D Shampoo · 200 ml", category: "Finished goods", lot: "SD-2609-25", stock: 540, unit: "pcs", minimum: 250, location: "FG · C-01", supplier: "—", status: "In stock" },
  ],
  purchaseOrders: [
    { id: "PO-2026-084", supplier: "Deccan Naturals", items: "Coconut oil · 120 L", date: "15 Oct 2026", expected: "21 Oct 2026", value: "₹ 28,800", status: "Awaiting delivery" },
    { id: "PO-2026-083", supplier: "HerbSource Co.", items: "Bhringraj powder · 40 kg", date: "14 Oct 2026", expected: "19 Oct 2026", value: "₹ 16,400", status: "Quality check" },
    { id: "PO-2026-082", supplier: "Packwell Industries", items: "Printed cartons · 2,000 pcs", date: "12 Oct 2026", expected: "18 Oct 2026", value: "₹ 12,000", status: "Approved" },
    { id: "PO-2026-081", supplier: "Greenleaf Botanicals", items: "Aloe vera extract · 60 kg", date: "10 Oct 2026", expected: "16 Oct 2026", value: "₹ 24,000", status: "Received" },
  ],
  qualityChecks: [
    { id: "QC-2610-038", material: "Bhringraj leaf powder", lot: "BR-2609-03", supplier: "HerbSource Co.", received: "15 Oct 2026", inspector: "Nisha K.", status: "Under test" },
    { id: "QC-2610-037", material: "Coconut oil, cold pressed", lot: "CO-2609-06", supplier: "Deccan Naturals", received: "14 Oct 2026", inspector: "Rahul P.", status: "Under test" },
    { id: "QC-2610-036", material: "Aloe vera extract", lot: "AV-2609-18", supplier: "Greenleaf Botanicals", received: "13 Oct 2026", inspector: "Nisha K.", status: "Approved" },
    { id: "QC-2610-035", material: "Printed carton · Hair Oil", lot: "CT-2609-09", supplier: "Packwell Industries", received: "12 Oct 2026", inspector: "Amol D.", status: "On hold" },
  ],
  batches: [
    { id: "BMR-2610-024", product: "Triple P.V. Ayurvedic Hair Oil", lot: "PV-2610-02", target: 1200, actual: 860, line: "Filling line 01", operator: "Amit P.", started: "09:15", status: "In progress" },
    { id: "BMR-2610-023", product: "Sahanchara D Shampoo", lot: "SD-2610-01", target: 900, actual: 900, line: "Filling line 02", operator: "Meera S.", started: "08:00", status: "Quality check" },
    { id: "BMR-2610-022", product: "Cucumba Anti-Pimples Cream", lot: "CU-2610-04", target: 600, actual: 420, line: "Cream line 01", operator: "Rohan T.", started: "10:30", status: "In progress" },
    { id: "BMR-2610-021", product: "Chandanadi Kalk Dark Circle Cream", lot: "CK-2610-03", target: 500, actual: 500, line: "Cream line 02", operator: "Anjali R.", started: "07:45", status: "Completed" },
  ],
  team: [
    { id: "TM-001", name: "Shravan Awale", role: "Administrator", module: "All modules", status: "Active", initials: "SA" },
    { id: "TM-002", name: "Nisha Kulkarni", role: "Quality in-charge", module: "Quality · Inventory", status: "Active", initials: "NK" },
    { id: "TM-003", name: "Amit Patil", role: "Operator", module: "Production", status: "Active", initials: "AP" },
    { id: "TM-004", name: "Rahul Pawar", role: "Store in-charge", module: "Inventory · Purchasing", status: "Active", initials: "RP" },
    { id: "TM-005", name: "Meera Shah", role: "Manager", module: "Dashboard · Reports", status: "Active", initials: "MS" },
  ],
};
