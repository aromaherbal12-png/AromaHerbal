# Frontend Migration Guide: localStorage → Backend API

## Overview

The frontend is being migrated from localStorage-based state management to backend API integration. This ensures data persistence, multi-user support, and proper server-side validation.

## What Changed

### Before (Old - localStorage)
```jsx
import { useGRNs } from './context/GRNContext';

const { grns, createGRN, purchaseOrders, createPurchaseOrder } = useGRNs();
```
- All data stored in browser localStorage
- Data lost when localStorage is cleared
- No server validation
- No multi-user synchronization

### After (New - Backend API)
```jsx
import { useInventory } from './context/InventoryContext';

const { goodsReceipts, createGoodsReceipt, purchaseOrders, createPurchaseOrder } = useInventory();
```
- All data stored in MongoDB via backend APIs
- Persistent across sessions and devices
- Server-side validation enforced
- Multi-user support with proper auth

## Migration Steps

### 1. Update Imports

**Old:**
```jsx
import { useGRNs } from './context/GRNContext';
```

**New:**
```jsx
import { useInventory } from './context/InventoryContext';
```

### 2. Update Context Usage

**Old:**
```jsx
const { grns, createGRN, updateGRN } = useGRNs();
```

**New:**
```jsx
const { goodsReceipts, createGoodsReceipt, updateGoodsReceipt } = useInventory();
// OR use backward-compatible aliases:
const { grns, createGRN, updateGRN } = useInventory();
```

### 3. Handle Async Operations

All new API calls are asynchronous and should be wrapped in try-catch:

**Old (synchronous localStorage):**
```jsx
const handleCreate = () => {
  const grn = createGRN(data);
  console.log("Created:", grn);
};
```

**New (async API calls):**
```jsx
const handleCreate = async () => {
  try {
    const grn = await createGoodsReceipt(data);
    console.log("Created:", grn);
  } catch (error) {
    console.error("Failed:", error);
    alert(error.message);
  }
};
```

### 4. Update Provider in App

**Old:**
```jsx
<AuthProvider>
  <GRNProvider>
    <App />
  </GRNProvider>
</AuthProvider>
```

**New:**
```jsx
<AuthProvider>
  <InventoryProvider>
    <App />
  </InventoryProvider>
</AuthProvider>
```

## API Mapping Reference

### Purchase Orders

| Old Method | New Method | Notes |
|------------|------------|-------|
| `createPurchaseOrder(data)` | `createPurchaseOrder(data)` | Now async, requires supplier ObjectId |
| `updatePurchaseOrder(id, updates)` | `updatePurchaseOrder(id, data)` | Now async |
| `recordPurchaseOrderReceipt()` | Not needed | Handled automatically via GRN creation |

### Goods Receipts (GRN)

| Old Method | New Method | Notes |
|------------|------------|-------|
| `grns` | `goodsReceipts` or `grns` (alias) | State variable |
| `createGRN(data)` | `createGoodsReceipt(data)` or `createGRN()` (alias) | Now async |
| `updateGRN(id, updates)` | `updateGoodsReceipt(id, data)` | Now async |
| `approveGRNFromQC()` | `changeGRNStatus(id, "Approved")` | Simplified API |
| `addToInventoryDirect()` | Use `changeGRNStatus()` instead | Server handles stock transactions |

### Stock Operations

| Old Method | New Method | Notes |
|------------|------------|-------|
| `consumeProductionMaterials()` | `issueToProduction(data)` | Now server-validated |
| `recordInventoryMovement()` | Automatic via API | Server creates transactions |

### Inventory Queries

| Old Method | New Method | Notes |
|------------|------------|-------|
| `getInventoryByCategory()` | `getInventoryByCategory()` | Same signature |
| `getRawMaterialInventory()` | `getRawMaterialInventory()` | Same signature |
| `getInventorySummaryByCategory()` | `getInventorySummaryByCategory()` | Same signature |

## Data Structure Changes

### Purchase Order Items

**Old:**
```javascript
{
  id: "ITEM-123",
  description: "Material name",
  quantity: 100,
  unit: "kg",
  rate: 50
}
```

**New:**
```javascript
{
  _id: "507f1f77bcf86cd799439011",
  material: "507f...", // ObjectId reference
  materialCode: "MAT-001",
  materialName: "Material name",
  orderedQty: 100,
  receivedQty: 0,
  unit: "kg",
  unitPrice: 50,
  gstRate: 18,
  totalAmount: 5900
}
```

### Goods Receipt (GRN)

**Old:**
```javascript
{
  id: "GRN-123",
  material: "Material name",
  receivedQty: 100,
  status: "Pending Inspection"
}
```

**New:**
```javascript
{
  _id: "507f1f77bcf86cd799439011",
  grnNumber: "GRN-20241220-ABC123",
  purchaseOrder: "507f...", // ObjectId
  items: [{
    material: "507f...",
    materialCode: "MAT-001",
    materialName: "Material name",
    receivedQty: 100,
    qualityStatus: "Pending Inspection"
  }],
  status: "Pending"
}
```

## Loading States

The new context provides loading states:

```jsx
const { loading, error, goodsReceipts, fetchGoodsReceipts } = useInventory();

if (loading.goodsReceipts) return <div>Loading...</div>;
if (error) return <div>Error: {error}</div>;
```

## Error Handling

Always handle errors in API calls:

```jsx
const handleSubmit = async (data) => {
  try {
    await createPurchaseOrder(data);
    alert("Success!");
  } catch (error) {
    const message = error?.data?.message || error.message || "Operation failed";
    alert(message);
    
    // Check for specific error types
    if (error.statusCode === 409) {
      // Handle duplicate/conflict
    }
    if (error.statusCode === 400) {
      // Handle validation error
      console.log("Validation errors:", error.data?.details);
    }
  }
};
```

## Testing During Migration

Both contexts can coexist during migration:

```jsx
import { useGRNs } from './context/GRNContext'; // Old
import { useInventory } from './context/InventoryContext'; // New

// Use old context for read-only operations
const { grns: localGRNs } = useGRNs();

// Use new context for write operations
const { createGoodsReceipt } = useInventory();
```

## Common Issues

### 1. Purchase Order Not Found

**Error:** "Purchase Order XYZ not found"

**Cause:** Frontend PO created in localStorage, not in backend

**Solution:** Create PO via backend API first:
```jsx
// Create supplier first (if new)
const supplier = await createSupplier({
  supplierCode: "SUP-001",
  name: "Supplier Name"
});

// Create PO with backend
const po = await createPurchaseOrder({
  supplierId: supplier._id,
  items: [{ materialId: "...", orderedQty: 100, unitPrice: 50 }]
});

// Then create GRN
const grn = await createGoodsReceipt({
  purchaseOrderId: po._id,
  items: [...]
});
```

### 2. Material Not Found

**Error:** "Material does not exist or is inactive"

**Cause:** Material not created in backend

**Solution:** Create material via API:
```jsx
const material = await createMaterial({
  materialCode: "MAT-001",
  name: "Material Name",
  category: "Raw Material",
  unit: "KG"
});
```

### 3. Validation Errors

**Error:** "Request validation failed"

**Cause:** Missing required fields or invalid formats

**Solution:** Check error details:
```jsx
try {
  await createPurchaseOrder(data);
} catch (error) {
  console.log("Validation errors:", error.data?.details);
  // Shows: [{ field: "items.0.orderedQty", message: "Must be greater than 0" }]
}
```

## Rollback Plan

If issues arise, you can temporarily revert to localStorage:

1. Change import back to `useGRNs`
2. Update Provider in App.jsx to `GRNProvider`
3. Revert async/await to synchronous calls

## Timeline

- **Phase 1 (Current):** Both contexts available, migration in progress
- **Phase 2 (Week 2):** All new features use InventoryContext only
- **Phase 3 (Month 1):** GRNContext deprecated and removed

## Support

For migration issues, check:
1. Browser console for detailed error messages
2. Network tab to see API request/response
3. Backend logs for server-side errors

---

**Last Updated:** 2024-12-20
