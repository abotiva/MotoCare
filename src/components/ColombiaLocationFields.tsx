import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type ColombiaLocationValue = {
  departmentCode: string
  departmentName: string
  municipalityCode: string
  municipalityName: string
}

type CatalogOption = { code: string; name: string }

type Props = {
  departmentCode: string
  municipalityCode: string
  onChange: (value: ColombiaLocationValue) => void
  required?: boolean
  className?: string
}

const selectClassName = 'h-10 w-full rounded-lg border border-white/10 bg-moto-darker px-3 text-sm text-white outline-none focus:border-moto-orange disabled:cursor-not-allowed disabled:opacity-60'

export function ColombiaLocationFields({
  departmentCode,
  municipalityCode,
  onChange,
  required = false,
  className = 'grid gap-4 sm:grid-cols-2',
}: Props) {
  const [departments, setDepartments] = useState<CatalogOption[]>([])
  const [municipalities, setMunicipalities] = useState<CatalogOption[]>([])
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true)
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setIsLoadingDepartments(false)
      return
    }
    let active = true
    void supabase.from('colombia_departments').select('code, name').order('name').then(({ data }) => {
      if (active) {
        setDepartments((data ?? []) as CatalogOption[])
        setIsLoadingDepartments(false)
      }
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!supabase || !departmentCode) {
      setMunicipalities([])
      setIsLoadingMunicipalities(false)
      return
    }
    let active = true
    setIsLoadingMunicipalities(true)
    void supabase
      .from('colombia_municipalities')
      .select('code, name')
      .eq('department_code', departmentCode)
      .order('name')
      .then(({ data }) => {
        if (active) {
          setMunicipalities((data ?? []) as CatalogOption[])
          setIsLoadingMunicipalities(false)
        }
      })
    return () => { active = false }
  }, [departmentCode])

  return (
    <div className={className}>
      <label className="min-w-0">
        <span className="mb-1 block text-sm text-gray-400">Departamento</span>
        <select
          required={required}
          disabled={isLoadingDepartments}
          value={departmentCode}
          onChange={(event) => {
            const nextCode = event.target.value
            const department = departments.find((item) => item.code === nextCode)
            onChange({
              departmentCode: nextCode,
              departmentName: department?.name ?? '',
              municipalityCode: '',
              municipalityName: '',
            })
          }}
          className={selectClassName}
        >
          <option value="">{isLoadingDepartments ? 'Cargando departamentos...' : 'Seleccione un departamento'}</option>
          {departments.map((department) => <option key={department.code} value={department.code}>{department.name}</option>)}
        </select>
      </label>

      <label className="min-w-0">
        <span className="mb-1 block text-sm text-gray-400">Municipio o ciudad</span>
        <select
          required={required}
          disabled={!departmentCode || isLoadingMunicipalities}
          value={municipalityCode}
          onChange={(event) => {
            const nextCode = event.target.value
            const municipality = municipalities.find((item) => item.code === nextCode)
            const department = departments.find((item) => item.code === departmentCode)
            onChange({
              departmentCode,
              departmentName: department?.name ?? '',
              municipalityCode: nextCode,
              municipalityName: municipality?.name ?? '',
            })
          }}
          className={selectClassName}
        >
          <option value="">{!departmentCode ? 'Seleccione primero el departamento' : isLoadingMunicipalities ? 'Cargando municipios...' : 'Seleccione un municipio'}</option>
          {municipalities.map((municipality) => <option key={municipality.code} value={municipality.code}>{municipality.name}</option>)}
        </select>
      </label>
    </div>
  )
}
