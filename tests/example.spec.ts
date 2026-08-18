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

test('exige aceptar los documentos legales durante el registro', async ({ page }) => {
  await page.goto('/login?mode=signup')
  const createButton = page.getByRole('button', { name: 'Crear cuenta' })
  await expect(page.getByRole('link', { name: 'Términos y Condiciones' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Política de Privacidad' })).toBeVisible()
  await expect(createButton).toBeDisabled()
  await page.getByRole('checkbox', { name: /Acepto los Términos/ }).check()
  await page.getByRole('checkbox', { name: /He leído la Política/ }).check()
})

test('publica las rutas legales sin exigir sesión', async ({ page }) => {
  await page.goto('/legal/terminos')
  await expect(page.getByRole('heading', { name: 'Términos y Condiciones' })).toBeVisible()
  await expect(page.getByText('Borrador no publicable')).toBeVisible()
  await page.goto('/legal/privacidad')
  await expect(page.getByRole('heading', { name: 'Política de Privacidad' })).toBeVisible()
})
