# Service-Level Validation Guide

## Overview
While Zod validation handles request input validation, service-level validation ensures business logic constraints are enforced.

## Current Status
✅ Request validation implemented with Zod schemas  
⚠️ Service-level validation should be added for business rules

## Best Practices

### 1. Validate Business Rules
```javascript
// Example: Validate stock availability before issuing materials
async function issueMaterialsToProduction(materialId, quantity, userId) {
  // Service-level validation
  const stock = await getStockBalance(materialId);
  
  if (stock.availableQty < quantity) {
    throw new ApiError(400, "Insufficient stock available");
  }
  
  if (stock.isDeleted || !stock.isActive) {
    throw new ApiError(400, "Material is not available");
  }
  
  // Proceed with operation...
}
```

### 2. Validate State Transitions
```javascript
// Example: Validate production batch status before completing
async function completeProductionBatch(batchId, userId) {
  const batch = await ProductionBatch.findById(batchId);
  
  if (!batch) {
    throw new ApiError(404, "Production batch not found");
  }
  
  // Service-level validation
  if (batch.status !== "In Progress") {
    throw new ApiError(400, "Only in-progress batches can be completed");
  }
  
  if (!batch.bmrReviewed) {
    throw new ApiError(400, "BMR review is required before completion");
  }
  
  // Proceed with operation...
}
```

### 3. Validate Related Entities
```javascript
// Example: Validate PO and supplier exist before creating GRN
async function createGoodsReceipt(poId, supplierId, items, userId) {
  const [po, supplier] = await Promise.all([
    PurchaseOrder.findById(poId),
    Supplier.findById(supplierId),
  ]);
  
  // Service-level validation
  if (!po) {
    throw new ApiError(404, "Purchase order not found");
  }
  
  if (po.status === "Cancelled") {
    throw new ApiError(400, "Cannot receive against cancelled PO");
  }
  
  if (!supplier || supplier.isDeleted) {
    throw new ApiError(400, "Invalid or inactive supplier");
  }
  
  // Proceed with operation...
}
```

### 4. Validate Permissions & Ownership
```javascript
// Example: Validate user can modify the resource
async function updatePurchaseOrder(orderId, updates, userId) {
  const order = await PurchaseOrder.findById(orderId);
  
  if (!order) {
    throw new ApiError(404, "Purchase order not found");
  }
  
  // Service-level validation
  if (order.status === "Approved" || order.status === "Completed") {
    throw new ApiError(400, "Cannot modify approved/completed orders");
  }
  
  // Proceed with operation...
}
```

## Checklist for Service Functions

For each service function that modifies data, ensure:

- [ ] All required entities exist
- [ ] Entities are in valid state (not deleted, not inactive)
- [ ] State transitions are valid
- [ ] Business rules are enforced
- [ ] Quantities/amounts are within acceptable ranges
- [ ] Related entities are compatible
- [ ] User has necessary permissions
- [ ] Concurrent modifications are handled

## Implementation Strategy

### Phase 1: Critical Operations
Add service validation to:
- Material issuance (stock checks)
- Purchase order approval (status validation)
- GRN creation (PO validation)
- Production batch completion (status + BMR validation)
- QC decisions (sample status validation)

### Phase 2: Financial Operations
- Payment validations
- Cost calculations
- Rate validations

### Phase 3: All Remaining Operations
- Systematic review of all service functions
- Add validation where needed
- Document validation rules

## Notes

- **Don't duplicate request validation** - Zod handles that
- **Focus on business logic** - state, relationships, constraints
- **Return clear error messages** - help users understand what went wrong
- **Log validation failures** - for debugging and monitoring
