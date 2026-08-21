import { expect, test } from '@playwright/test'
import { selectPrimaryMotorcycle } from '../src/lib/motorcycles'
import { daysUntil, formatDate, formatMileage, formatRelativeDate } from '../src/lib/formatters'
import type { Motorcycle } from '../src/types/database'

function motorcycle(id: string, brand: string): Motorcycle {
  return {
    id,
    owner_id: 'user-1',
    brand,
    model: 'Modelo',
    year: 2024,
    plate: null,
    color: null,
    mileage: 18420,
    image_url: null,
    soat_expires_on: null,
    technical_review_expires_on: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

test.describe('reglas del Home de la moto', () => {
  test('selecciona la moto principal y usa la primera como respaldo', () => {
    const motorcycles = [motorcycle('first', 'Honda'), motorcycle('primary', 'Kawasaki')]
    expect(selectPrimaryMotorcycle(motorcycles, 'primary')?.brand).toBe('Kawasaki')
    expect(selectPrimaryMotorcycle(motorcycles, 'missing')?.brand).toBe('Honda')
    expect(selectPrimaryMotorcycle([], null)).toBeNull()
  })

  test('presenta kilometraje y fechas con formato colombiano', () => {
    expect(formatMileage(18420)).toContain('18.420 km')
    expect(formatDate('2026-08-21')).toContain('2026')
  })

  test('clasifica fechas futuras, actuales y vencidas', () => {
    const now = new Date('2026-08-21T12:00:00')
    expect(daysUntil('2026-08-25', now)).toBe(4)
    expect(formatRelativeDate('2026-08-21', now)).toBe('Para hoy')
    expect(formatRelativeDate('2026-08-20', now)).toBe('Vencido hace 1 día')
  })
})
