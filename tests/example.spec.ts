import { expect, test } from '@playwright/test'

test('muestra la página principal de MotoCare', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/MotoCare Co/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Tu moto. Tu historia. Tu mantenimiento.').first()).toBeVisible()
})

test('permite navegar al inicio de sesión', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Comenzar', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Entrar a la app' })).toBeVisible()
})
