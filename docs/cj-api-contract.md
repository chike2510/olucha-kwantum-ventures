# CJ API contract references

The implementation uses CJ's official API 2.0 documentation. These notes capture the endpoint semantics used by the application; no API credentials or live responses are included.

## Authentication and product catalogue

- [Authentication](https://developers.cjdropshipping.com/en/api/api2/api/auth.html): `POST /authentication/getAccessToken`; the access token lifetime is 180 days and the account-level rate limit is 1 request/second.
- [Product API](https://developers.cjdropshipping.com/en/api/api2/api/product.html): `GET /product/listV2` supports keyword search and pagination (up to 100 products/page); `GET /product/query?pid=...` returns product details and variants; `GET /product/variant/query?pid=...` is the variant fallback; `GET /product/stock/getInventoryByPid?pid=...` returns per-variant inventory with warehouse country codes and inventory counts.
- [Product synchronization guide](https://developers.cjdropshipping.com/en/api/start/Products-Synchronization-Processing.html): the normal import-read sequence is product list → product details → variants when needed → real-time inventory.

## Shipping method validation and order submission

- [Logistics API](https://developers.cjdropshipping.com/en/api/api2/api/logistic.html): `POST /logistic/getAvailableLogistics` requires a real product/variant SKU and shipping-from country; it accepts a destination country and returns exact `logisticsName` values usable for that SKU/route.
- [Order synchronization guide](https://developers.cjdropshipping.com/en/api/start/Orders-Synchronization-Processing.html): CJ Logistics submission uses `shopLogisticsType=2`, leaves `storageId` empty, and specifies `logisticName`.
- [Shopping API](https://developers.cjdropshipping.com/en/api/api2/api/shopping.html): `POST /shopping/order/createOrderV3` accepts an order number, shipping fields, `products[].vid`, quantity and store line-item reference. The documented `payType=3` mode creates an order without initiating supplier payment; payment is a separate step. The application must not call CJ payment endpoints. `GET /shopping/order/getOrderDetail?orderId=...` supports lookup by a custom order ID, which can be used for reconciliation.

## Tracking

- [Logistics API](https://developers.cjdropshipping.com/en/api/api2/api/logistic.html): `GET /logistic/trackInfo?trackNumber=...` returns the tracking number, status, delivery time and last-mile carrier data. CJ documents exact tracking-number matching; synchronization must additionally verify the returned CJ order belongs to the local order before saving it.
