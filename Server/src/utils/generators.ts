/**
 * Generators utility for creating unique identifiers
 */

/**
 * Generates a unique invoice number for orders
 * Format: ORD-YYYYMMDD-XXXX where XXXX is a random number
 * @returns string
 */
export const generateInvoiceNumber = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number

    return `ORD-${year}${month}${day}-${random}`;
};

/**
 * Generates a unique purchase order number
 * Format: PO-YYYYMMDD-XXXX where XXXX is a random number
 * @returns string
 */
export const generatePurchaseOrderNumber = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number

    return `PO-${year}${month}${day}-${random}`;
};
