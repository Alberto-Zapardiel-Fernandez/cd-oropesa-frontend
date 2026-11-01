import { useEffect, useState } from 'react'
import Input from '../common/Input'
import { fetchApi } from '../../services/api'
import { CARD_STYLES } from '../common/theme'

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  birthDate: '',
  dni: '',
  licenseNumber: '',
  address: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  gdprConsent: false
}
const MAX_FILE_BYTES = 5 * 1024 * 1024
const PHOTO_UPLOAD_MAX_DIMENSION = 2000
const IMAGE_PROCESSING_TIMEOUT_MS = 30000

const normalizeText = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()

const trimmedOrNull = value => String(value ?? '').trim() || null
const documentKindLabel = kind => ({
  DNI_FRONT: 'DNI · Anverso',
  DNI_BACK: 'DNI · Reverso',
  OTHER: 'Documento adicional'
}[kind] || 'Documento')

const validateOriginalDocument = (file, kind) => {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`"${file.name}" supera el límite de 5 MB. Reduce el tamaño del archivo antes de subirlo.`)
  }
  const allowedTypes = kind === 'OTHER'
    ? ['image/jpeg', 'image/png', 'application/pdf']
    : ['image/jpeg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    throw new Error(kind === 'OTHER'
      ? 'Los documentos adicionales deben ser JPG, PNG o PDF.'
      : 'Las caras del DNI deben ser imágenes JPG o PNG.')
  }
  return file
}

const compressImageFile = async file => {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_FILE_BYTES) throw new Error('El PDF no puede superar 5 MB.')
    return file
  }

  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('Usa una imagen JPG/PNG o un documento PDF.')
  }

  const maxDimension = PHOTO_UPLOAD_MAX_DIMENSION
  const qualities = [0.86, 0.78, 0.7]
  const worker = new Worker(new URL('../../workers/imageCompressor.worker.js', import.meta.url), {
    type: 'module'
  })

  const compressedBlob = await new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      worker.terminate()
      reject(new Error(`La preparación de "${file.name}" tardó demasiado. Prueba con una imagen más pequeña.`))
    }, IMAGE_PROCESSING_TIMEOUT_MS)

    worker.onmessage = event => {
      window.clearTimeout(timeoutId)
      worker.terminate()
      if (event.data.error) {
        reject(new Error(event.data.error))
      } else {
        resolve(event.data.blob)
      }
    }

    worker.onerror = () => {
      window.clearTimeout(timeoutId)
      worker.terminate()
      reject(new Error(`El navegador no pudo preparar "${file.name}". Prueba con otra imagen o navegador.`))
    }

    worker.postMessage({ file, maxDimension, qualities })
  })

  if (compressedBlob.size > MAX_FILE_BYTES) throw new Error('La imagen sigue superando 5 MB después de comprimirla.')

  const baseName = file.name.replace(/\.[^.]+$/, '')
  return new File([compressedBlob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now()
  })
}

export default function AdminPlayers() {
  const [players, setPlayers] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingPlayerId, setEditingPlayerId] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [dniFrontFile, setDniFrontFile] = useState(null)
  const [dniBackFile, setDniBackFile] = useState(null)
  const [documentationFiles, setDocumentationFiles] = useState([])
  const [fileInputKey, setFileInputKey] = useState(0)
  const [fileAccess, setFileAccess] = useState({})
  const [loadingFileAccess, setLoadingFileAccess] = useState('')
  const [viewingPlayer, setViewingPlayer] = useState(null)
  const [viewerFiles, setViewerFiles] = useState({})
  const [loadingViewer, setLoadingViewer] = useState(false)
  const [viewerError, setViewerError] = useState('')
  const [pendingFileDeletion, setPendingFileDeletion] = useState(null)
  const [deletingFile, setDeletingFile] = useState(false)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingStep, setSavingStep] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPlayers() {
      try {
        const data = await fetchApi('/players')
        setPlayers(data)
      } catch (err) {
        setError(err.message || 'No se pudieron cargar las fichas de jugadores.')
      } finally {
        setLoading(false)
      }
    }

    loadPlayers()
  }, [])

  useEffect(() => {
    if (!notice) return undefined

    const timeoutId = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timeoutId)
  }, [notice])

  useEffect(() => {
    if (!viewingPlayer) return undefined

    const handleKeyDown = event => {
      if (event.key === 'Escape') setViewingPlayer(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewingPlayer])

  const handleChange = event => {
    const { name, value, type, checked } = event.target
    setForm(current => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleEdit = player => {
    setEditingPlayerId(player.id)
    setForm({
      ...EMPTY_FORM,
      ...player,
      birthDate: player.birthDate || '',
      gdprConsent: Boolean(player.gdprConsent)
    })
    setPhotoFile(null)
    setDniFrontFile(null)
    setDniBackFile(null)
    setDocumentationFiles([])
    setFileInputKey(current => current + 1)
    setSearch(`${player.firstName} ${player.lastName}`)
    setError('')
    setNotice('')
    if (player.photoUrl) void handleGetPhotoAccess(player)
    for (const document of player.documentation || []) {
      void handleGetDocumentAccess(player, document)
    }
  }

  const handleCancelEdit = () => {
    setEditingPlayerId(null)
    setForm(EMPTY_FORM)
    setPhotoFile(null)
    setDniFrontFile(null)
    setDniBackFile(null)
    setDocumentationFiles([])
    setFileInputKey(current => current + 1)
    setError('')
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)
    setSavingStep('Preparando archivos...')

    const payload = {
      firstName: String(form.firstName ?? '').trim(),
      lastName: String(form.lastName ?? '').trim(),
      birthDate: form.birthDate,
      dni: trimmedOrNull(form.dni),
      licenseNumber: trimmedOrNull(form.licenseNumber),
      address: trimmedOrNull(form.address),
      guardianName: trimmedOrNull(form.guardianName),
      guardianPhone: trimmedOrNull(form.guardianPhone),
      guardianEmail: trimmedOrNull(form.guardianEmail),
      gdprConsent: Boolean(form.gdprConsent)
    }

    const selectedUploads = [
      photoFile && { file: photoFile, route: 'photo' },
      dniFrontFile && { file: dniFrontFile, route: 'documentation', kind: 'DNI_FRONT' },
      dniBackFile && { file: dniBackFile, route: 'documentation', kind: 'DNI_BACK' },
      ...documentationFiles.map(file => ({ file, route: 'documentation', kind: 'OTHER' }))
    ].filter(Boolean)

    const uploads = []
    try {
      for (const [index, upload] of selectedUploads.entries()) {
        setSavingStep(`Preparando archivo ${index + 1} de ${selectedUploads.length}...`)
        uploads.push({
          ...upload,
          sourceFile: upload.file,
          file: upload.route === 'photo'
            ? await compressImageFile(upload.file)
            : validateOriginalDocument(upload.file, upload.kind)
        })
      }
    } catch (err) {
      setError(err.message || 'No se pudieron preparar los archivos.')
      setSaving(false)
      setSavingStep('')
      return
    }

    let savedPlayer
    try {
      setSavingStep('Guardando ficha...')
      if (editingPlayerId) {
        savedPlayer = await fetchApi(`/players/${editingPlayerId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
      } else {
        savedPlayer = await fetchApi('/players', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
      }
    } catch (err) {
      setError(err.message || 'No se pudo guardar la ficha del jugador.')
      setSaving(false)
      setSavingStep('')
      return
    }

    setPlayers(current => [
      savedPlayer,
      ...current.filter(player => player.id !== savedPlayer.id)
    ])
    setFileAccess(current => Object.fromEntries(
      Object.entries(current).filter(([key]) => !key.startsWith(`${savedPlayer.id}:`))
    ))

    const completedUploads = []
    try {
      for (const upload of uploads) {
        setSavingStep(upload.route === 'photo'
          ? 'Subiendo fotografía...'
          : `Subiendo ${upload.kind === 'OTHER' ? 'documentación' : 'cara del DNI'}...`)
        const body = new FormData()
        body.append('file', upload.file)
        if (upload.kind) body.append('kind', upload.kind)
        savedPlayer = await fetchApi(`/players/${savedPlayer.id}/${upload.route}`, {
          method: 'POST',
          body
        })
        completedUploads.push(upload)
      }

      setPlayers(current => [
        savedPlayer,
        ...current.filter(player => player.id !== savedPlayer.id)
      ])
      setNotice(
        uploads.length
          ? `Ficha guardada y ${uploads.length === 1 ? 'archivo subido' : 'archivos subidos'} correctamente.`
          : editingPlayerId
            ? `Ficha de ${payload.firstName} ${payload.lastName} actualizada.`
            : `Jugador ${payload.firstName} ${payload.lastName} insertado correctamente.`
      )
      setSearch(`${payload.firstName} ${payload.lastName}`)
      setEditingPlayerId(null)
      setForm(EMPTY_FORM)
      setPhotoFile(null)
      setDniFrontFile(null)
      setDniBackFile(null)
      setDocumentationFiles([])
      setFileInputKey(current => current + 1)
    } catch (err) {
      setPlayers(current => [
        savedPlayer,
        ...current.filter(player => player.id !== savedPlayer.id)
      ])
      if (completedUploads.some(upload => upload.route === 'photo')) setPhotoFile(null)
      if (completedUploads.some(upload => upload.kind === 'DNI_FRONT')) setDniFrontFile(null)
      if (completedUploads.some(upload => upload.kind === 'DNI_BACK')) setDniBackFile(null)
      const completedOtherFiles = new Set(
        completedUploads.filter(upload => upload.kind === 'OTHER').map(upload => upload.sourceFile)
      )
      if (completedOtherFiles.size) {
        setDocumentationFiles(current => current.filter(file => !completedOtherFiles.has(file)))
      }
      if (completedUploads.length) setFileInputKey(current => current + 1)
      setEditingPlayerId(savedPlayer.id)
      setSearch(`${payload.firstName} ${payload.lastName}`)
      setError(
        `La ficha se guardó, pero no se pudo completar la subida: ${err.message || 'error del servidor'}. Puedes reintentar sin crear otra ficha.`
      )
    } finally {
      setSaving(false)
      setSavingStep('')
    }
  }

  const handleGetPhotoAccess = async player => {
    const key = `${player.id}:photo`
    setLoadingFileAccess(key)
    setError('')

    try {
      const response = await fetchApi(`/players/${player.id}/photo-access`)
      setFileAccess(current => ({ ...current, [key]: response.url }))
    } catch (err) {
      setError(err.message || 'No se pudo generar el acceso temporal al archivo.')
    } finally {
      setLoadingFileAccess('')
    }
  }

  const handleGetDocumentAccess = async (player, document) => {
    const key = `${player.id}:document:${document.id}`
    setLoadingFileAccess(key)
    setError('')

    try {
      const response = await fetchApi(`/players/${player.id}/documentation/${document.id}/access`)
      setFileAccess(current => ({ ...current, [key]: response.url }))
    } catch (err) {
      setError(err.message || 'No se pudo generar el acceso temporal al documento.')
    } finally {
      setLoadingFileAccess('')
    }
  }

  const handleViewFiles = async player => {
    const availableFiles = [
      player.photoUrl && { key: 'photo', route: 'photo-access' },
      ...(player.documentation || []).map(document => ({
        key: `document:${document.id}`,
        route: `documentation/${document.id}/access`
      }))
    ].filter(Boolean)

    setViewingPlayer(player)
    setViewerFiles({})
    setViewerError('')
    setLoadingViewer(true)

    try {
      const signedFiles = await Promise.all(availableFiles.map(async file => {
        const response = await fetchApi(`/players/${player.id}/${file.route}`)
        return [file.key, response.url]
      }))
      setViewerFiles(Object.fromEntries(signedFiles))
    } catch (err) {
      setViewerError(err.message || 'No se pudieron cargar los archivos privados.')
    } finally {
      setLoadingViewer(false)
    }
  }

  const handleDeleteFile = async () => {
    if (!pendingFileDeletion || deletingFile) return

    const { player, fileType, label } = pendingFileDeletion
    const route = fileType === 'photo' ? 'photo' : `documentation/${pendingFileDeletion.documentId}`
    setDeletingFile(true)
    setError('')
    setViewerError('')

    try {
      const updatedPlayer = await fetchApi(`/players/${player.id}/${route}`, { method: 'DELETE' })
      setPlayers(current => current.map(item => item.id === player.id ? updatedPlayer : item))
      setFileAccess(current => {
        const next = { ...current }
        delete next[`${player.id}:${fileType}`]
        if (fileType === 'documentation') {
          delete next[`${player.id}:document:${pendingFileDeletion.documentId}`]
        }
        return next
      })
      setViewerFiles(current => {
        const next = { ...current }
        delete next[fileType]
        if (fileType === 'documentation') delete next[`document:${pendingFileDeletion.documentId}`]
        return next
      })
      setViewingPlayer(current => current?.id === player.id ? updatedPlayer : current)
      setForm(current => editingPlayerId === player.id
        ? {
            ...current,
            photoUrl: updatedPlayer.photoUrl,
            documentation: updatedPlayer.documentation
          }
        : current)
      setNotice(`${label} eliminado correctamente.`)
      setPendingFileDeletion(null)
    } catch (err) {
      const message = err.message || `No se pudo eliminar ${label.toLocaleLowerCase()}.`
      if (viewingPlayer?.id === player.id) {
        setViewerError(message)
      } else {
        setError(message)
      }
    } finally {
      setDeletingFile(false)
    }
  }

  const downloadUrl = (url, filename) =>
    `${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(filename)}`

  const viewerFileCount = Number(Boolean(viewerFiles.photo))
    + (viewingPlayer?.documentation?.length || 0)

  const normalizedSearch = normalizeText(search.trim())
  const matchingPlayers = normalizedSearch
    ? players.filter(player => normalizeText(`${player.firstName} ${player.lastName} ${player.address || ''}`).includes(normalizedSearch))
    : []
  const visiblePlayers = matchingPlayers.slice(0, 5)

  return (
    <div className={`${CARD_STYLES.panel} space-y-6`}>
      {notice && (
        <div
          role='status'
          aria-live='polite'
          className='fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] items-start justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-slate-900 p-4 text-sm text-emerald-300 shadow-2xl sm:left-auto sm:w-auto sm:max-w-md'
        >
          <span>{notice}</span>
          <button
            type='button'
            onClick={() => setNotice('')}
            className='min-h-6 min-w-6 font-bold text-emerald-200'
            aria-label='Cerrar aviso'
          >
            ×
          </button>
        </div>
      )}

      <div>
        <h3 className='text-lg font-black tracking-wide text-white'>Fichas de jugadores</h3>
        <p className='mt-1 text-xs text-slate-400'>Los datos personales se gestionan por separado de la inscripción en cada equipo.</p>
      </div>

      {error && (
        <p
          role='alert'
          className='rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-300'
        >
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className='space-y-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4'
      >
        <h4 className='text-sm font-bold text-white'>{editingPlayerId ? 'Editar ficha' : 'Dar de alta jugador'}</h4>

        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          <Input
            label='Nombre'
            name='firstName'
            value={form.firstName}
            onChange={handleChange}
            required
          />
          <Input
            label='Apellidos'
            name='lastName'
            value={form.lastName}
            onChange={handleChange}
            required
          />
          <Input
            label='Fecha de nacimiento'
            name='birthDate'
            type='date'
            value={form.birthDate}
            onChange={handleChange}
            required
          />
          <Input
            label='DNI/NIE'
            name='dni'
            value={form.dni || ''}
            onChange={handleChange}
          />
          <Input
            label='N.º licencia'
            name='licenseNumber'
            value={form.licenseNumber || ''}
            onChange={handleChange}
          />
          <Input
            label='Dirección'
            name='address'
            value={form.address || ''}
            onChange={handleChange}
          />
          <Input
            label='Nombre del tutor'
            name='guardianName'
            value={form.guardianName || ''}
            onChange={handleChange}
          />
          <Input
            label='Teléfono del tutor'
            name='guardianPhone'
            type='tel'
            value={form.guardianPhone || ''}
            onChange={handleChange}
          />
          <Input
            label='Email del tutor'
            name='guardianEmail'
            type='email'
            value={form.guardianEmail || ''}
            onChange={handleChange}
          />
        </div>

        <div className='space-y-2'>
          <label
            htmlFor={`player-documentation-${fileInputKey}`}
            className='block text-xs font-bold uppercase tracking-wider text-slate-400'
          >
            Documentación adicional
          </label>
          <input
            type='file'
            id={`player-documentation-${fileInputKey}`}
            key={`documentation-${fileInputKey}`}
            accept='image/jpeg,image/png,application/pdf'
            multiple
            onChange={event => setDocumentationFiles(Array.from(event.target.files || []))}
            className='block min-h-11 w-full rounded-2xl border border-slate-800 bg-slate-950 p-2 text-sm normal-case text-slate-300 file:mr-3 file:min-h-9 file:rounded-xl file:border-0 file:bg-slate-800 file:px-3 file:font-semibold file:text-white'
          />
          <span className='block break-words text-xs font-normal text-slate-500 [overflow-wrap:anywhere]'>
            {documentationFiles.length
              ? documentationFiles.map(file => file.name).join(', ')
              : 'Puedes seleccionar varios JPG, PNG o PDF; cada archivo se conserva sin modificar (máximo 5 MB por archivo).'}
          </span>
        </div>

        <div className='grid gap-4 lg:grid-cols-3'>
          <div className='min-w-0 space-y-2 lg:col-span-1'>
            <label
              htmlFor={`player-photo-${fileInputKey}`}
              className='block text-xs font-bold uppercase tracking-wider text-slate-400'
            >
              Fotografía
            </label>
            <input
              type='file'
              id={`player-photo-${fileInputKey}`}
              key={`photo-${fileInputKey}`}
              accept='image/jpeg,image/png'
              capture='environment'
              onChange={event => setPhotoFile(event.target.files?.[0] || null)}
              className='block min-h-11 w-full rounded-2xl border border-slate-800 bg-slate-950 p-2 text-sm normal-case text-slate-300 file:mr-3 file:min-h-9 file:rounded-xl file:border-0 file:bg-slate-800 file:px-3 file:font-semibold file:text-white'
            />
            <span className='block break-words text-xs font-normal text-slate-500 [overflow-wrap:anywhere]'>
              {photoFile?.name || (form.photoUrl ? 'Ya hay una foto guardada; selecciona otra para reemplazarla.' : 'JPG/PNG. Se reducirá la resolución antes de subirla.')}
            </span>
            {editingPlayerId && form.photoUrl && (
              <ExistingFilePreview
                label='Foto guardada'
                url={fileAccess[`${editingPlayerId}:photo`]}
                loading={loadingFileAccess === `${editingPlayerId}:photo`}
                onLoad={() => handleGetPhotoAccess({ id: editingPlayerId })}
                onDelete={() => setPendingFileDeletion({
                  player: { id: editingPlayerId },
                  fileType: 'photo',
                  label: 'la fotografía'
                })}
                image
              />
            )}
          </div>

          <div className='min-w-0 space-y-3 lg:col-span-2'>
            <h4 className='text-xs font-bold uppercase tracking-wider text-slate-400'>Documento de identidad</h4>
            <div className='grid gap-3 sm:grid-cols-2'>
              {[
                { kind: 'DNI_FRONT', label: 'DNI · Anverso', file: dniFrontFile, setFile: setDniFrontFile },
                { kind: 'DNI_BACK', label: 'DNI · Reverso', file: dniBackFile, setFile: setDniBackFile }
              ].map(side => {
                const document = (form.documentation || []).find(item => item.kind === side.kind)
                const fileKey = `${editingPlayerId}:document:${document?.id}`
                return (
                  <div key={side.kind} className='min-w-0 space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3'>
                    <label
                      htmlFor={`player-${side.kind.toLowerCase()}-${fileInputKey}`}
                      className='block text-xs font-bold text-slate-300'
                    >
                      {side.label}
                    </label>
                    <input
                      type='file'
                      id={`player-${side.kind.toLowerCase()}-${fileInputKey}`}
                      key={`${side.kind}-${fileInputKey}`}
                      accept='image/jpeg,image/png'
                      capture='environment'
                      onChange={event => side.setFile(event.target.files?.[0] || null)}
                      className='block min-h-11 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-sm normal-case text-slate-300 file:mr-2 file:min-h-9 file:rounded-lg file:border-0 file:bg-slate-800 file:px-2 file:font-semibold file:text-white'
                    />
                    <span className='block break-words text-xs text-slate-500 [overflow-wrap:anywhere]'>
                      {side.file?.name || 'JPG/PNG · máximo 5 MB'}
                    </span>
                    {document && (
                      <ExistingFilePreview
                        label='Archivo guardado'
                        url={fileAccess[fileKey]}
                        loading={loadingFileAccess === fileKey}
                        image
                        onLoad={() => handleGetDocumentAccess({ id: editingPlayerId }, document)}
                        onDelete={() => setPendingFileDeletion({
                          player: { id: editingPlayerId },
                          fileType: 'documentation',
                          documentId: document.id,
                          label: documentKindLabel(document.kind).toLocaleLowerCase()
                        })}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {(form.documentation || []).filter(document => document.kind === 'OTHER').length > 0 && (
          <div className='space-y-2'>
            <h4 className='text-xs font-bold uppercase tracking-wider text-slate-400'>Archivos guardados</h4>
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {(form.documentation || []).filter(document => document.kind === 'OTHER').map(document => {
                const fileKey = `${editingPlayerId}:document:${document.id}`
                return (
                  <ExistingFilePreview
                    key={document.id}
                    label={document.fileName || documentKindLabel(document.kind)}
                    url={fileAccess[fileKey]}
                    loading={loadingFileAccess === fileKey}
                    image={document.contentType?.startsWith('image/')}
                    onLoad={() => handleGetDocumentAccess({ id: editingPlayerId }, document)}
                    onDelete={() => setPendingFileDeletion({
                      player: { id: editingPlayerId },
                      fileType: 'documentation',
                      documentId: document.id,
                      label: document.fileName || 'el documento'
                    })}
                  />
                )
              })}
            </div>
          </div>
        )}

        <label className='flex min-h-11 items-center gap-2 text-sm text-slate-300'>
          <input
            type='checkbox'
            name='gdprConsent'
            checked={form.gdprConsent}
            onChange={handleChange}
            className='h-4 w-4 accent-blue-600'
          />
          Consentimiento RGPD registrado
        </label>

        <div className='flex flex-col gap-3 sm:flex-row'>
          <button
            type='submit'
            disabled={saving}
            className='min-h-11 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50'
          >
            {saving ? savingStep : editingPlayerId ? 'Guardar cambios' : 'Crear ficha'}
          </button>

          {editingPlayerId && (
            <button
              type='button'
              onClick={handleCancelEdit}
              className='min-h-11 rounded-2xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800'
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <section className='space-y-3'>
        <Input
          label='Buscar jugador por nombre o dirección'
          name='playerSearch'
          type='search'
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder='Empieza a escribir para buscar...'
        />

        {loading ? (
          <p className='text-sm text-slate-400'>Cargando jugadores...</p>
        ) : players.length === 0 ? (
          <p className='rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-center text-sm text-slate-500'>Todavía no hay fichas creadas.</p>
        ) : !normalizedSearch ? (
          <p className='rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-center text-sm text-slate-500'>
            Escribe un nombre o una dirección para buscar en las fichas.
          </p>
        ) : matchingPlayers.length === 0 ? (
          <p className='rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-center text-sm text-slate-500'>
            No hay jugadores que coincidan con la búsqueda.
          </p>
        ) : (
          <>
            <p className='text-xs text-slate-400'>
              {matchingPlayers.length === 1 ? '1 jugador encontrado' : `${matchingPlayers.length} jugadores encontrados`}
              {matchingPlayers.length > 5 && ' · Mostrando los 5 primeros; concreta la búsqueda para acotar.'}
            </p>

            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {visiblePlayers.map(player => (
                <div
                  key={player.id}
                  className={`flex min-w-0 items-center justify-between gap-3 px-4 py-3.5 ${CARD_STYLES.item}`}
                >
                  <div className='min-w-0'>
                    <span className='block break-words text-sm font-bold text-white'>
                      {player.firstName} {player.lastName}
                    </span>
                    <span className='mt-1 block text-xs text-slate-400'>Nacimiento: {player.birthDate || 'Sin fecha'}</span>
                  </div>
                  <div className='flex shrink-0 flex-col gap-2'>
                    {(player.photoUrl || player.documentation?.length > 0) && (
                      <button
                        type='button'
                        onClick={() => handleViewFiles(player)}
                        className='min-h-11 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500'
                      >
                        Ver ficha
                      </button>
                    )}
                    <button
                      type='button'
                      onClick={() => handleEdit(player)}
                      className='min-h-11 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800'
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {viewingPlayer && (
        <div
          className='fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6'
          onMouseDown={event => {
            if (event.target === event.currentTarget) setViewingPlayer(null)
          }}
        >
          <section
            role='dialog'
            aria-modal='true'
            aria-labelledby='player-files-title'
            className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-6 ${viewerFileCount > 1 ? 'max-w-6xl' : 'max-w-2xl'}`}
          >
            <div className='mb-5 flex items-start justify-between gap-4'>
              <div>
                <h3 id='player-files-title' className='text-lg font-black text-white'>
                  Ficha de {viewingPlayer.firstName} {viewingPlayer.lastName}
                </h3>
                <p className='mt-1 text-sm text-slate-400'>Archivos privados · Los enlaces caducan en 5 minutos</p>
              </div>
              <button
                type='button'
                onClick={() => setViewingPlayer(null)}
                className='min-h-11 min-w-11 rounded-xl border border-slate-700 px-3 text-lg text-slate-300 hover:bg-slate-800'
                aria-label='Cerrar ficha'
              >
                ×
              </button>
            </div>

            {loadingViewer ? (
              <p role='status' className='rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-300'>
                Cargando archivos privados...
              </p>
            ) : viewerError ? (
              <p role='alert' className='rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300'>
                {viewerError}
              </p>
            ) : (
              <div className={`grid min-w-0 gap-4 ${viewerFileCount > 1 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                {viewerFiles.photo && (
                  <article className='mx-auto min-w-0 w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-950/70 p-3'>
                    <h4 className='mb-3 text-sm font-bold text-white'>Fotografía</h4>
                    <img
                      src={viewerFiles.photo}
                      alt={`Fotografía de ${viewingPlayer.firstName} ${viewingPlayer.lastName}`}
                      className='mx-auto h-[min(62vh,600px)] w-full rounded-xl object-contain'
                    />
                    <a
                      href={downloadUrl(viewerFiles.photo, 'fotografia.jpg')}
                      target='_blank'
                      rel='noreferrer'
                      className='mt-3 inline-flex min-h-11 items-center rounded-xl border border-slate-700 px-4 text-sm font-semibold text-blue-300 hover:bg-slate-800'
                    >
                      Abrir / Descargar
                    </a>
                    <button
                      type='button'
                      onClick={() => setPendingFileDeletion({
                        player: viewingPlayer,
                        fileType: 'photo',
                        label: 'la fotografía'
                      })}
                      className='ml-2 mt-3 inline-flex min-h-11 items-center rounded-xl border border-red-500/40 px-4 text-sm font-semibold text-red-300 hover:bg-red-500/10'
                    >
                      Eliminar archivo
                    </button>
                  </article>
                )}
                {(viewingPlayer.documentation || []).map(document => {
                  const url = viewerFiles[`document:${document.id}`]
                  if (!url) return null
                  return (
                    <article
                      key={document.id}
                      className='mx-auto min-w-0 w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-950/70 p-3'
                    >
                      <h4 className='mb-3 break-words text-sm font-bold text-white'>
                        {documentKindLabel(document.kind)} · {document.fileName}
                      </h4>
                      <ResponsivePrivatePreview
                        src={url}
                        title={`${documentKindLabel(document.kind)} de ${viewingPlayer.firstName} ${viewingPlayer.lastName}`}
                      />
                      <a
                        href={downloadUrl(url, document.fileName || 'documento')}
                        target='_blank'
                        rel='noreferrer'
                        className='mt-3 inline-flex min-h-11 items-center rounded-xl border border-slate-700 px-4 text-sm font-semibold text-blue-300 hover:bg-slate-800'
                      >
                        Abrir / Descargar
                      </a>
                      <button
                        type='button'
                        onClick={() => setPendingFileDeletion({
                          player: viewingPlayer,
                          fileType: 'documentation',
                          documentId: document.id,
                          label: documentKindLabel(document.kind).toLocaleLowerCase()
                        })}
                        className='ml-2 mt-3 inline-flex min-h-11 items-center rounded-xl border border-red-500/40 px-4 text-sm font-semibold text-red-300 hover:bg-red-500/10'
                      >
                        Eliminar archivo
                      </button>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {pendingFileDeletion && (
        <div
          className='fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm'
          onMouseDown={event => {
            if (!deletingFile && event.target === event.currentTarget) setPendingFileDeletion(null)
          }}
        >
          <section
            role='alertdialog'
            aria-modal='true'
            aria-labelledby='delete-player-file-title'
            className='w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl'
          >
            <h3 id='delete-player-file-title' className='text-lg font-black text-white'>
              ¿Eliminar {pendingFileDeletion.label}?
            </h3>
            <p className='mt-2 text-sm leading-6 text-slate-300'>
              Se borrará permanentemente de Storage y se quitará de la ficha del jugador. Esta acción no se puede deshacer.
            </p>
            <div className='mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
              <button
                type='button'
                disabled={deletingFile}
                onClick={() => setPendingFileDeletion(null)}
                className='min-h-11 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50'
              >
                Cancelar
              </button>
              <button
                type='button'
                disabled={deletingFile}
                onClick={handleDeleteFile}
                className='min-h-11 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50'
              >
                {deletingFile ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function ExistingFilePreview({ label, url, loading, onLoad, onDelete, image = false }) {
  return (
    <div className='min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-3'>
      <div className='grid min-w-0 grid-cols-2 gap-2'>
        <span className='col-span-2 break-words text-xs font-semibold text-slate-300 [overflow-wrap:anywhere]'>
          {label}
        </span>
        {url ? (
          <a
            href={`${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(image ? 'fotografia.jpg' : 'documento-dni')}`}
            target='_blank'
            rel='noreferrer'
            className='inline-flex min-h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-700 px-2 text-center text-[11px] font-semibold text-blue-300 hover:bg-slate-800 sm:px-3 sm:text-xs'
          >
            Abrir / Descargar
          </a>
        ) : null}
        {!url && (
          <button
            type='button'
            onClick={onLoad}
            disabled={loading}
            className='inline-flex min-h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-700 px-2 text-center text-[11px] font-semibold text-blue-300 hover:bg-slate-800 disabled:opacity-50 sm:px-3 sm:text-xs'
          >
            {loading ? 'Cargando...' : 'Previsualizar'}
          </button>
        )}
        <button
          type='button'
          onClick={onDelete}
          className='inline-flex min-h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-lg border border-red-500/40 px-2 text-center text-[11px] font-semibold text-red-300 hover:bg-red-500/10 sm:px-3 sm:text-xs'
        >
          Eliminar archivo
        </button>
      </div>
      {url && image && (
        <img
          src={url}
          alt='Vista previa de la fotografía guardada'
          className='mt-3 max-h-40 w-full rounded-lg object-contain'
        />
      )}
      {url && !image && (
        <ResponsivePrivatePreview
          key={url}
          src={url}
          title='Vista previa del documento guardado'
          className='mt-3 h-40'
        />
      )}
    </div>
  )
}

function ResponsivePrivatePreview({ src, title, className = '' }) {
  const [renderAsImage, setRenderAsImage] = useState(true)

  if (!renderAsImage) {
    return (
      <iframe
        src={src}
        title={title}
        className={`w-full rounded-xl bg-white ${className || 'h-[min(62vh,600px)]'}`}
      />
    )
  }

  return (
    <img
      src={src}
      alt={title}
      onError={() => setRenderAsImage(false)}
      className={`mx-auto w-full rounded-xl object-contain ${className || 'h-[min(62vh,600px)]'}`}
    />
  )
}
