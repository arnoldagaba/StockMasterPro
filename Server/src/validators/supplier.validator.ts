import { z } from 'zod';

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Supplier name is required',
    }).min(2, 'Supplier name must be at least 2 characters'),
    contactName: z.string().optional(),
    email: z.string().email('Invalid email format').optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateSupplierSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    name: z.string().min(2, 'Supplier name must be at least 2 characters').optional(),
    contactName: z.string().optional(),
    email: z.string().email('Invalid email format').optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const getSupplierSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
});

export const searchSuppliersSchema = z.object({
  query: z.object({
    name: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>['body'];
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>['body']; 