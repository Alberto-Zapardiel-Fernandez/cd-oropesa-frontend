self.addEventListener('message', async event => {
  const { file, maxDimension, qualities } = event.data
  let bitmap

  try {
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') {
      throw new Error('Este navegador no permite preparar imágenes aquí. Prueba con una versión actualizada.')
    }

    bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('No se pudo preparar la imagen en este dispositivo.')
    }

    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    bitmap = null

    let blob
    for (const quality of qualities) {
      blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
      if (blob.size <= 5 * 1024 * 1024 || quality === qualities[qualities.length - 1]) break
    }

    self.postMessage({ blob })
  } catch (error) {
    self.postMessage({
      error: error.message || 'No se pudo leer o comprimir la imagen.'
    })
  } finally {
    bitmap?.close()
  }
})
