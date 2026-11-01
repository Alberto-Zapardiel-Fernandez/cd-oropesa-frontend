import { useEffect, useMemo, useState } from 'react'
import Input from '../common/Input'
import { fetchApi } from '../../services/api'
import { CARD_STYLES } from '../common/theme'

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  dni: '',
  phone: '',
  address: '',
  email: '',
  licenseNumber: '',
  qualification: '',
  status: 'ACTIVE'
}
const MAX_FILE_BYTES = 5 * 1024 * 1024
const FILE_CLASS =
  'block min-h-11 w-full rounded-2xl border border-slate-800 bg-slate-950 p-2 text-sm text-slate-300 file:mr-3 file:min-h-9 file:rounded-xl file:border-0 file:bg-slate-800 file:px-3 file:font-semibold file:text-white'
const SELECT_CLASS =
  'w-full min-w-0 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600'
const ROLES = [
  ['HEAD_COACH', 'Primer entrenador'],
  ['SECOND_COACH', 'Segundo entrenador'],
  ['THIRD_COACH', 'Tercer entrenador'],
  ['ASSISTANT_COACH', 'Ayudante de entrenador'],
  ['DELEGATE', 'Delegado'],
  ['GOALKEEPER_COACH', 'Entrenador de porteros'],
  ['FITNESS_COACH', 'Preparador físico'],
  ['PHYSIOTHERAPIST', 'Fisioterapeuta'],
  ['KIT_MANAGER', 'Utillero']
]
const DOCUMENT_LABELS = {
  DNI_FRONT: 'DNI · Anverso',
  DNI_BACK: 'DNI · Reverso',
  OTHER: 'Documento adicional'
}

const cleanOptional = value => String(value ?? '').trim() || null

export default function AdminCoaches() {
  const [coaches, setCoaches] = useState([])
  const [teams, setTeams] = useState([])
  const [teamStaff, setTeamStaff] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [coachToAssign, setCoachToAssign] = useState('')
  const [roleToAssign, setRoleToAssign] = useState('HEAD_COACH')
  const [editingCoachId, setEditingCoachId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [photoFile, setPhotoFile] = useState(null)
  const [dniFrontFile, setDniFrontFile] = useState(null)
  const [dniBackFile, setDniBackFile] = useState(null)
  const [documentFiles, setDocumentFiles] = useState([])
  const [fileAccess, setFileAccess] = useState({})
  const [fileInputKey, setFileInputKey] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedTeam = teams.find(team => team.id === selectedTeamId)
  const visibleCoaches = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return coaches
    return coaches.filter(coach =>
      `${coach.firstName} ${coach.lastName} ${coach.dni} ${coach.email}`
        .toLocaleLowerCase()
        .includes(query)
    )
  }, [coaches, search])

  useEffect(() => {
    let active = true
    Promise.all([fetchApi('/coaches'), fetchApi('/teams')])
      .then(([coachesData, teamsData]) => {
        if (!active) return
        setCoaches(coachesData)
        setTeams(teamsData)
      })
      .catch(err => {
        if (active) setError(err.message || 'No se pudo cargar el cuerpo técnico y los equipos.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedTeamId) return undefined
    let active = true
    fetchApi(`/teams/${selectedTeamId}/staff`)
      .then(assignments => {
        if (active) setTeamStaff(assignments)
      })
      .catch(err => {
        if (active) setError(err.message || 'No se pudo cargar la asignación del equipo.')
      })
    return () => {
      active = false
    }
  }, [selectedTeamId])

  const updateForm = event => {
    const { name, value } = event.target
    setForm(current => ({ ...current, [name]: value }))
  }

  const resetFiles = () => {
    setPhotoFile(null)
    setDniFrontFile(null)
    setDniBackFile(null)
    setDocumentFiles([])
    setFileInputKey(current => current + 1)
  }

  const getDocumentUrl = async (coach, document) => {
    const key = `${coach.id}:document:${document.id}`
    try {
      const result = await fetchApi(`/coaches/${coach.id}/documentation/${document.id}/access`)
      setFileAccess(current => ({ ...current, [key]: result.url }))
    } catch (err) {
      setError(err.message || 'No se pudo abrir el documento.')
    }
  }

  const handleEdit = async coach => {
    setEditingCoachId(coach.id)
    setForm({ ...EMPTY_FORM, ...coach, status: coach.status || 'ACTIVE' })
    resetFiles()
    setFileAccess({})
    setError('')
    if (coach.photoUrl) {
      try {
        const result = await fetchApi(`/coaches/${coach.id}/photo-access`)
        setFileAccess(current => ({ ...current, [`${coach.id}:photo`]: result.url }))
      } catch (err) {
        setError(err.message || 'No se pudo cargar la fotografía.')
      }
    }
    for (const document of coach.documentation || []) {
      void getDocumentUrl(coach, document)
    }
  }

  const handleCancelEdit = () => {
    setEditingCoachId(null)
    setForm(EMPTY_FORM)
    resetFiles()
    setError('')
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)

    const payload = {
      firstName: String(form.firstName || '').trim(),
      lastName: String(form.lastName || '').trim(),
      dni: String(form.dni || '').trim(),
      phone: String(form.phone || '').trim(),
      address: cleanOptional(form.address),
      email: String(form.email || '').trim(),
      licenseNumber: cleanOptional(form.licenseNumber),
      qualification: cleanOptional(form.qualification),
      status: form.status
    }
    const uploads = [
      photoFile && { file: photoFile, route: 'photo', kind: null },
      dniFrontFile && { file: dniFrontFile, route: 'documentation', kind: 'DNI_FRONT' },
      dniBackFile && { file: dniBackFile, route: 'documentation', kind: 'DNI_BACK' },
      ...documentFiles.map(file => ({ file, route: 'documentation', kind: 'OTHER' }))
    ].filter(Boolean)

    try {
      for (const upload of uploads) validateUpload(upload.file, upload.kind)
      let savedCoach = editingCoachId
        ? await fetchApi(`/coaches/${editingCoachId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await fetchApi('/coaches', { method: 'POST', body: JSON.stringify(payload) })

      setCoaches(current => [savedCoach, ...current.filter(item => item.id !== savedCoach.id)])
      for (const upload of uploads) {
        const body = new FormData()
        body.append('file', upload.file)
        if (upload.kind) body.append('kind', upload.kind)
        savedCoach = await fetchApi(`/coaches/${savedCoach.id}/${upload.route}`, {
          method: 'POST',
          body
        })
        setCoaches(current => [savedCoach, ...current.filter(item => item.id !== savedCoach.id)])
      }
      setCoaches(current => [savedCoach, ...current.filter(item => item.id !== savedCoach.id)])
      setNotice(uploads.length ? 'Ficha y archivos guardados correctamente.' : 'Ficha guardada correctamente.')
      setEditingCoachId(null)
      setForm(EMPTY_FORM)
      resetFiles()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la ficha del cuerpo técnico.')
      if (editingCoachId) {
        setCoaches(current => current.map(item => item.id === editingCoachId
          ? { ...item, ...payload }
          : item))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDocument = async (coach, document) => {
    if (!window.confirm(`¿Eliminar ${document.fileName || DOCUMENT_LABELS[document.kind]}?`)) return
    try {
      const updated = await fetchApi(`/coaches/${coach.id}/documentation/${document.id}`, {
        method: 'DELETE'
      })
      setCoaches(current => current.map(item => item.id === coach.id ? updated : item))
      if (editingCoachId === coach.id) setForm(current => ({ ...current, documentation: updated.documentation }))
      setFileAccess(current => {
        const next = { ...current }
        delete next[`${coach.id}:document:${document.id}`]
        return next
      })
      setNotice('Documento eliminado correctamente.')
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el documento.')
    }
  }

  const handleDeletePhoto = async coach => {
    if (!window.confirm('¿Eliminar la fotografía guardada?')) return
    try {
      const updated = await fetchApi(`/coaches/${coach.id}/photo`, { method: 'DELETE' })
      setCoaches(current => current.map(item => item.id === coach.id ? updated : item))
      if (editingCoachId === coach.id) setForm(current => ({ ...current, photoUrl: null }))
      setFileAccess(current => {
        const next = { ...current }
        delete next[`${coach.id}:photo`]
        return next
      })
      setNotice('Fotografía eliminada correctamente.')
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la fotografía.')
    }
  }

  const handleAddAssignment = async event => {
    event.preventDefault()
    if (!selectedTeamId || !coachToAssign) return
    setSavingAssignment(true)
    setError('')
    try {
      const assignment = await fetchApi(`/teams/${selectedTeamId}/staff`, {
        method: 'POST',
        body: JSON.stringify({ coachId: coachToAssign, roleInTeam: roleToAssign })
      })
      setTeamStaff(current => [...current, assignment])
      setNotice('Cargo asignado al equipo.')
    } catch (err) {
      setError(err.message || 'No se pudo asignar el cargo.')
    } finally {
      setSavingAssignment(false)
    }
  }

  const handleRemoveAssignment = async assignment => {
    const roleLabel = ROLES.find(([value]) => value === assignment.roleInTeam)?.[1] || assignment.roleInTeam
    if (!window.confirm(`¿Quitar a ${assignment.firstName} ${assignment.lastName} como ${roleLabel}?`)) return
    try {
      await fetchApi(`/teams/${selectedTeamId}/staff/${assignment.id}`, { method: 'DELETE' })
      setTeamStaff(current => current.filter(item => item.id !== assignment.id))
      setNotice('Cargo quitado del equipo; la ficha de la persona se conserva.')
    } catch (err) {
      setError(err.message || 'No se pudo quitar el cargo.')
    }
  }

  const handleDeleteCoach = async coach => {
    if (!window.confirm(`¿Eliminar la ficha de ${coach.firstName} ${coach.lastName}?`)) return
    try {
      await fetchApi(`/coaches/${coach.id}`, { method: 'DELETE' })
      setCoaches(current => current.filter(item => item.id !== coach.id))
      if (editingCoachId === coach.id) handleCancelEdit()
      setNotice('Ficha eliminada.')
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la ficha. Comprueba que no tenga asignaciones a equipos.')
    }
  }

  if (loading) {
    return <div className={`${CARD_STYLES.panel} text-sm text-slate-400`}>Cargando cuerpo técnico...</div>
  }

  return (
    <div className={`${CARD_STYLES.panel} space-y-6`}>
      <header>
        <h3 className='text-lg font-black tracking-wide text-white'>Cuerpo técnico</h3>
        <p className='mt-1 text-xs text-slate-400'>
          Gestiona fichas, documentación privada y cargos por equipo. Una persona puede tener varios cargos.
        </p>
      </header>

      {error && <p role='alert' className='break-words rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'>{error}</p>}
      {notice && <p role='status' className='rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300'>{notice}</p>}

      <form onSubmit={handleSubmit} className='space-y-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4'>
        <h4 className='text-sm font-bold text-white'>{editingCoachId ? 'Editar ficha' : 'Añadir miembro'}</h4>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          <Input label='Nombre' name='firstName' value={form.firstName} onChange={updateForm} required />
          <Input label='Apellidos' name='lastName' value={form.lastName} onChange={updateForm} required />
          <Input label='DNI/NIE' name='dni' value={form.dni} onChange={updateForm} required />
          <Input label='Teléfono' name='phone' type='tel' value={form.phone} onChange={updateForm} required />
          <Input label='Email' name='email' type='email' value={form.email} onChange={updateForm} required />
          <Input label='Dirección' name='address' value={form.address || ''} onChange={updateForm} />
          <Input label='Licencia federativa' name='licenseNumber' value={form.licenseNumber || ''} onChange={updateForm} />
          <Input label='Titulación' name='qualification' value={form.qualification || ''} onChange={updateForm} />
          <label className='space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-400'>
            Estado
            <select name='status' value={form.status} onChange={updateForm} className={SELECT_CLASS}>
              <option value='ACTIVE'>Activo</option>
              <option value='INACTIVE'>Inactivo</option>
            </select>
          </label>
        </div>

        <div className='grid gap-4 lg:grid-cols-3'>
          <FilePicker
            label='Fotografía'
            accept='image/jpeg,image/png'
            file={photoFile}
            onChange={setPhotoFile}
            inputKey={`coach-photo-${fileInputKey}`}
          />
          <DniPicker
            label='DNI · Anverso'
            file={dniFrontFile}
            onChange={setDniFrontFile}
            inputKey={`coach-dni-front-${fileInputKey}`}
            document={(form.documentation || []).find(item => item.kind === 'DNI_FRONT')}
            coach={coaches.find(item => item.id === editingCoachId)}
            fileAccess={fileAccess}
            onOpen={getDocumentUrl}
            onDelete={handleDeleteDocument}
          />
          <DniPicker
            label='DNI · Reverso'
            file={dniBackFile}
            onChange={setDniBackFile}
            inputKey={`coach-dni-back-${fileInputKey}`}
            document={(form.documentation || []).find(item => item.kind === 'DNI_BACK')}
            coach={coaches.find(item => item.id === editingCoachId)}
            fileAccess={fileAccess}
            onOpen={getDocumentUrl}
            onDelete={handleDeleteDocument}
          />
        </div>

        {editingCoachId && form.photoUrl && (
          <PrivateFileRow
            label='Fotografía guardada'
            url={fileAccess[`${editingCoachId}:photo`]}
            image
            onOpen={async () => {
              const result = await fetchApi(`/coaches/${editingCoachId}/photo-access`)
              setFileAccess(current => ({ ...current, [`${editingCoachId}:photo`]: result.url }))
            }}
            onDelete={() => handleDeletePhoto({ id: editingCoachId })}
          />
        )}

        <FilePicker
          label='Documentación adicional'
          accept='image/jpeg,image/png,application/pdf'
          multiple
          fileLabel={documentFiles.length
            ? documentFiles.map(file => file.name).join(', ')
            : 'Varios PDF/JPG/PNG · máximo 5 MB por archivo'}
          onChange={setDocumentFiles}
          inputKey={`coach-documents-${fileInputKey}`}
        />

        {(form.documentation || []).filter(document => document.kind === 'OTHER').length > 0 && (
          <div className='space-y-2'>
            <h5 className='text-xs font-bold uppercase tracking-wider text-slate-400'>Documentos guardados</h5>
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {(form.documentation || []).filter(document => document.kind === 'OTHER').map(document => (
                <PrivateFileRow
                  key={document.id}
                  label={document.fileName}
                  url={fileAccess[`${editingCoachId}:document:${document.id}`]}
                  image={document.contentType?.startsWith('image/')}
                  onOpen={() => getDocumentUrl({ id: editingCoachId }, document)}
                  onDelete={() => handleDeleteDocument({ id: editingCoachId }, document)}
                />
              ))}
            </div>
          </div>
        )}

        <div className='flex flex-col gap-3 sm:flex-row'>
          <button type='submit' disabled={saving} className='min-h-11 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50'>
            {saving ? 'Guardando...' : editingCoachId ? 'Guardar cambios' : 'Crear ficha'}
          </button>
          {editingCoachId && (
            <button type='button' onClick={handleCancelEdit} className='min-h-11 rounded-2xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800'>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <section className='space-y-3'>
        <Input label='Buscar por nombre, DNI o email' name='coachSearch' value={search} onChange={event => setSearch(event.target.value)} />
        {visibleCoaches.length === 0 ? (
          <p className='rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-center text-sm text-slate-500'>No hay miembros del cuerpo técnico que coincidan.</p>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {visibleCoaches.map(coach => (
              <article key={coach.id} className={`flex min-w-0 items-center justify-between gap-3 p-4 ${CARD_STYLES.item}`}>
                <div className='min-w-0'>
                  <p className='break-words text-sm font-bold text-white'>{coach.firstName} {coach.lastName}</p>
                  <p className='mt-1 break-all text-xs text-slate-400'>{coach.email}</p>
                  <p className='mt-1 text-xs text-slate-500'>{coach.status === 'INACTIVE' ? 'Inactivo' : 'Activo'}</p>
                </div>
                <div className='flex shrink-0 flex-col gap-2'>
                  <button type='button' onClick={() => handleEdit(coach)} className='min-h-10 rounded-xl border border-slate-700 px-3 text-xs font-bold text-slate-300 hover:bg-slate-800'>Editar</button>
                  <button type='button' onClick={() => handleDeleteCoach(coach)} className='min-h-10 rounded-xl border border-red-500/40 px-3 text-xs font-bold text-red-300 hover:bg-red-500/10'>Eliminar</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className='space-y-4 border-t border-slate-800 pt-5'>
        <div>
          <h4 className='text-base font-bold text-white'>Asignación por equipo</h4>
          <p className='mt-1 text-xs text-slate-400'>Cada cargo es independiente; la misma persona puede desempeñar funciones distintas en diferentes equipos.</p>
        </div>
        <label className='block space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-400'>
          Equipo y temporada
          <select
            value={selectedTeamId}
            onChange={event => {
              setSelectedTeamId(event.target.value)
              setTeamStaff([])
              setError('')
            }}
            className={SELECT_CLASS}
          >
            <option value=''>Selecciona un equipo</option>
            {teams.map(team => <option key={team.id} value={team.id}>{team.name} · {team.season?.name || 'Sin temporada'}</option>)}
          </select>
        </label>
        {selectedTeam && (
          <>
            <form onSubmit={handleAddAssignment} className='grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:grid-cols-2'>
              <label className='space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-400'>
                Persona
                <select required value={coachToAssign} onChange={event => setCoachToAssign(event.target.value)} className={SELECT_CLASS}>
                  <option value=''>Selecciona una persona</option>
                  {coaches.filter(coach => coach.status !== 'INACTIVE').map(coach => (
                    <option key={coach.id} value={coach.id}>{coach.firstName} {coach.lastName}</option>
                  ))}
                </select>
              </label>
              <label className='space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-400'>
                Cargo en este equipo
                <select value={roleToAssign} onChange={event => setRoleToAssign(event.target.value)} className={SELECT_CLASS}>
                  {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <button type='submit' disabled={savingAssignment || !coachToAssign} className='min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50 sm:col-span-2'>
                {savingAssignment ? 'Asignando...' : 'Asignar cargo'}
              </button>
            </form>
            {teamStaff.length === 0 ? (
              <p className='rounded-xl border border-slate-800 p-4 text-center text-sm text-slate-500'>Este equipo aún no tiene cuerpo técnico asignado.</p>
            ) : (
              <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                {teamStaff.map(assignment => (
                  <div key={assignment.id} className='flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3'>
                    <div className='min-w-0'>
                      <p className='break-words text-sm font-semibold text-white'>{assignment.firstName} {assignment.lastName}</p>
                      <p className='mt-1 text-xs text-blue-300'>{ROLES.find(([value]) => value === assignment.roleInTeam)?.[1] || assignment.roleInTeam}</p>
                    </div>
                    <button type='button' onClick={() => handleRemoveAssignment(assignment)} className='min-h-10 shrink-0 rounded-xl border border-red-500/40 px-3 text-xs font-bold text-red-300 hover:bg-red-500/10'>Quitar cargo</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function validateUpload(file, kind) {
  if (file.size > MAX_FILE_BYTES) throw new Error(`"${file.name}" supera el límite de 5 MB.`)
  const allowedTypes = kind === 'DNI_FRONT' || kind === 'DNI_BACK'
    ? ['image/jpeg', 'image/png']
    : kind === null
      ? ['image/jpeg', 'image/png']
      : ['image/jpeg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    throw new Error(kind === null
      ? 'La fotografía debe ser JPG o PNG.'
      : 'Usa imágenes JPG/PNG para el DNI y JPG/PNG/PDF para documentación adicional.')
  }
}

function FilePicker({ label, accept, file, onChange, inputKey, multiple = false, fileLabel }) {
  const handleChange = event => {
    const selected = multiple ? Array.from(event.target.files || []) : event.target.files?.[0] || null
    onChange(selected)
  }
  const selectedLabel = fileLabel || file?.name || 'JPG/PNG · máximo 5 MB'
  return (
    <div className='min-w-0 space-y-2'>
      <label htmlFor={inputKey} className='block text-xs font-bold uppercase tracking-wider text-slate-400'>{label}</label>
      <input id={inputKey} key={inputKey} type='file' accept={accept} multiple={multiple} onChange={handleChange} className={FILE_CLASS} />
      <span className='block break-words text-xs text-slate-500 [overflow-wrap:anywhere]'>{selectedLabel}</span>
    </div>
  )
}

function DniPicker({ label, file, onChange, inputKey, document, coach, fileAccess, onOpen, onDelete }) {
  return (
    <div className='min-w-0 space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3'>
      <FilePicker label={label} accept='image/jpeg,image/png' file={file} onChange={onChange} inputKey={inputKey} />
      {document && coach && (
        <PrivateFileRow
          label='Archivo guardado'
          url={fileAccess[`${coach.id}:document:${document.id}`]}
          image
          onOpen={() => onOpen(coach, document)}
          onDelete={() => onDelete(coach, document)}
        />
      )}
    </div>
  )
}

function PrivateFileRow({ label, url, image = false, onOpen, onDelete }) {
  return (
    <div className='min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-3'>
      <p className='break-words text-xs font-semibold text-slate-300 [overflow-wrap:anywhere]'>{label}</p>
      <div className='mt-2 grid grid-cols-2 gap-2'>
        {url ? (
          <a href={`${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(label || 'documento')}`} target='_blank' rel='noreferrer' className='inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-lg border border-slate-700 px-2 text-center text-[11px] font-semibold text-blue-300 hover:bg-slate-800'>Abrir / Descargar</a>
        ) : (
          <button type='button' onClick={onOpen} className='min-h-10 rounded-lg border border-slate-700 px-2 text-[11px] font-semibold text-blue-300 hover:bg-slate-800'>Previsualizar</button>
        )}
        <button type='button' onClick={onDelete} className='min-h-10 rounded-lg border border-red-500/40 px-2 text-[11px] font-semibold text-red-300 hover:bg-red-500/10'>Eliminar archivo</button>
      </div>
      {url && image && <img src={url} alt={label} className='mt-3 max-h-40 w-full rounded-lg object-contain' />}
      {url && !image && <iframe src={url} title={label} className='mt-3 h-40 w-full rounded-lg bg-white' />}
    </div>
  )
}
