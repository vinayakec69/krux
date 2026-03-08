import { z } from 'zod';

// ── Auth schemas ──────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60, 'Name too long'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  location: z.string().min(2, 'Location is required').max(100, 'Location too long'),
});

// ── Scan / Session schemas ────────────────────────────────────────────────────

export const binIdSchema = z
  .string()
  .min(1, 'Bin ID is required')
  .max(64, 'Bin ID too long')
  .regex(/^[A-Za-z0-9_-]+$/, 'Bin ID contains invalid characters');

export const handshakeSchema = z.object({
  user_id: z.string().uuid(),
  bin_id: binIdSchema,
});

export const scanValidateSchema = z.object({
  session_id: z.string().uuid(),
  predicted_class: z.enum(['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'OTHER']),
  confidence: z.number().min(0).max(1),
  image_hash: z.string().max(256),
  perceptual_hash: z.string().max(256),
  color_histogram: z.string().max(2048),
  device_fingerprint: z.string().max(256),
  gps: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

export const dropEventSchema = z.object({
  bin_id: binIdSchema,
  ir_triggered: z.boolean(),
  delta_weight: z.number().optional(),
  timestamp: z.number().int().positive(),
});

// ── Marketplace / Orders schemas ──────────────────────────────────────────────

export const deliveryInfoSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z
    .string()
    .regex(/^[0-9+\- ]{7,15}$/, 'Invalid phone number'),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^[0-9]{4,10}$/, 'Invalid pincode'),
});

// ── Profile update schema ─────────────────────────────────────────────────────

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  location: z.string().min(2).max(100).optional(),
  avatar: z.string().max(10).optional(),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type HandshakeInput = z.infer<typeof handshakeSchema>;
export type ScanValidateInput = z.infer<typeof scanValidateSchema>;
export type DropEventInput = z.infer<typeof dropEventSchema>;
export type DeliveryInfoInput = z.infer<typeof deliveryInfoSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
