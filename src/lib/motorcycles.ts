import type { Motorcycle } from '@/types/database'

export function selectPrimaryMotorcycle(motorcycles: Motorcycle[], primaryId: string | null | undefined) {
  return motorcycles.find((motorcycle) => motorcycle.id === primaryId) ?? motorcycles[0] ?? null
}
