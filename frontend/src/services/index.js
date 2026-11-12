/**
 * index.js
 * Centralized export for all API services
 * 
 * Import pattern:
 *   import { inventoryApi, productionApi } from './services';
 */

export { default as api } from "./api.js";
export { default as inventoryApi } from "./inventoryApi.js";
export { default as productionApi } from "./productionApi.js";
export { default as qualityApi } from "./qualityApi.js";
export { default as finishedGoodsApi } from "./finishedGoodsApi.js";
export { default as dashboardApi } from "./dashboardApi.js";

// Named exports for convenience
export {
  materialsApi,
  suppliersApi,
  purchaseOrdersApi,
  goodsReceiptsApi,
  stockApi,
} from "./inventoryApi.js";

export {
  productionPlansApi,
  productionBatchesApi,
  productionEntriesApi,
  bmrApi,
} from "./productionApi.js";

export {
  materialQCApi,
  productionQCApi,
} from "./qualityApi.js";

export {
  finishedGoodsApi,
  dispatchApi,
} from "./finishedGoodsApi.js";
