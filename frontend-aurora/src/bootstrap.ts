/**
 * Se importa ANTES que el store compartido (@/store/appStore) para fijar
 * valores por defecto propios de Aurora (p. ej. tema oscuro) sin tocar el frontend clásico.
 */
try {
  if (!localStorage.getItem('theme')) {
    localStorage.setItem('theme', 'dark')
  }
} catch {
  // almacenamiento no disponible
}

export {}
