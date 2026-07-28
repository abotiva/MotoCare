import { z } from 'zod'

const optionalNonNegativeNumber = z.string().refine((value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0), 'Debe ser un número mayor o igual a cero.')

export const motorcycleFormSchema = z.object({
  brand: z.string().trim().min(1, 'La marca es obligatoria.'),
  model: z.string().trim().min(1, 'El modelo es obligatorio.'),
  year: z.string().refine((value) => value === '' || (Number(value) >= 1900 && Number(value) <= new Date().getFullYear() + 1), 'Ingresa un año válido.'),
  plate: z.string(),
  color: z.string(),
  mileage: optionalNonNegativeNumber,
  soat_expires_on: z.string(),
  technical_review_expires_on: z.string(),
})

export const serviceFormSchema = z.object({
  suggestion_id: z.string(),
  service_type: z.string().trim().min(1, 'El tipo de servicio es obligatorio.'),
  service_date: z.string().min(1, 'La fecha es obligatoria.'),
  mileage: optionalNonNegativeNumber,
  cost: optionalNonNegativeNumber,
  next_due_mileage: optionalNonNegativeNumber,
  next_due_date: z.string(),
  notes: z.string(),
})

export const reminderFormSchema = z.object({
  suggestion_id: z.string(),
  title: z.string().trim().min(1, 'El título es obligatorio.'),
  due_mileage: optionalNonNegativeNumber,
  due_date: z.string(),
}).refine((value) => value.due_mileage !== '' || value.due_date !== '', {
  message: 'Define una fecha o un kilometraje objetivo.',
})

export const mileageFormSchema = z.object({
  mileage: z.string().min(1, 'El kilometraje es obligatorio.').refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, 'Ingresa un kilometraje válido.'),
})

export const completionFormSchema = z.object({
  action: z.string().trim().min(1, 'La descripción es obligatoria.'),
  mileage: z.string().min(1, 'El kilometraje es obligatorio.').refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, 'Ingresa un kilometraje válido.'),
  service_date: z.string().min(1, 'La fecha es obligatoria.'),
  next_interval_km: optionalNonNegativeNumber,
  next_due_date: z.string(),
  notes: z.string(),
})
