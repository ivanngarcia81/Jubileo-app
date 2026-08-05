import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Zona horaria hostil a propósito: UTC+14. Si alguna función de fechas se
    // escapa a la hora local del proceso en vez de trabajar en fechas civiles,
    // las pruebas truenan aquí y no en el teléfono del usuario.
    env: { TZ: 'Pacific/Kiritimati' },
  },
})
