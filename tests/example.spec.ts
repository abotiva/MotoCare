import { expect, test } from '@playwright/test'

test('muestra la página principal de MotoCare', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/MotoCare/)
  await expect(page.getByRole('heading', { name: 'Toda la historia de tu moto, siempre contigo.' })).toBeVisible()
  await expect(page.getByText('Tu moto. Tu historia. Tu ruta.').first()).toBeVisible()
})

test('permite navegar al inicio de sesión', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: 'Ya tengo una cuenta', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Entrar a la app' })).toBeVisible()
})
