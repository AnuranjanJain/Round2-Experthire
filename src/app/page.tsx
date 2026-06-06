'use client'

import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  BadgeCheck,
  Brain,
  Clock3,
  Command,
  Droplets,
  HeartPulse,
  Languages,
  Layers3,
  ListFilter,
  Map,
  PanelBottomClose,
  PanelBottomOpen,
  Plus,
  Radio,
  Route,
  Satellite,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  incidents as seedIncidents,
  scenarioLabels,
  scenarioNotes,
  volunteers,
  zones,
  type Incident,
  type Scenario,
  type ScenarioMode,
  type Skill,
  type Volunteer,
  type Zone,
} from '@/data'
import { createDeploymentPlan, type Assignment, type DeploymentPlan, type ZonePlan } from '@/optimizer'

type SkillFilter = Skill | 'All Skills'
type OperationsTab = 'ai' | 'incidents' | 'volunteers'
type Tone = 'stable' | 'warning' | 'critical'

const scenarioOrder: ScenarioMode[] = ['balanced', 'snan-surge', 'heat-alert', 'missing-person']

const scenarioDefaults: Record<ScenarioMode, Pick<Scenario, 'crowdIntensity' | 'weatherStress'>> = {
  balanced: { crowdIntensity: 48, weatherStress: 32 },
  'snan-surge': { crowdIntensity: 82, weatherStress: 48 },
  'heat-alert': { crowdIntensity: 64, weatherStress: 86 },
  'missing-person': { crowdIntensity: 58, weatherStress: 42 },
}

const incidentTemplates: Array<Pick<Incident, 'type' | 'severity' | 'requiredSkill' | 'zoneId'>> = [
  {
    zoneId: 'lost-helpdesk',
    type: 'Family tracing escalation',
    severity: 5,
    requiredSkill: 'Child Support',
  },
  {
    zoneId: 'bus-corridor',
    type: 'Bus bay compression',
    severity: 4,
    requiredSkill: 'Logistics',
  },
  {
    zoneId: 'sangam-ghat',
    type: 'Water relief queue',
    severity: 3,
    requiredSkill: 'Water Relief',
  },
  {
    zoneId: 'akshayavat',
    type: 'Translation support line',
    severity: 2,
    requiredSkill: 'Language Support',
  },
]

const skillIcons: Record<Skill, typeof Users> = {
  'Crowd Guidance': Users,
  'Medical Aid': HeartPulse,
  'Language Support': Languages,
  Logistics: Route,
  'Security Liaison': ShieldCheck,
  'Child Support': BadgeCheck,
  'Water Relief': Droplets,
}

const skills: Skill[] = [
  'Crowd Guidance',
  'Medical Aid',
  'Language Support',
  'Logistics',
  'Security Liaison',
  'Child Support',
  'Water Relief',
]

function percent(value: number) {
  return `${Math.round(value)}%`
}

function riskTone(risk: number): Tone {
  if (risk >= 82) return 'critical'
  if (risk >= 68) return 'warning'
  return 'stable'
}

function toneClass(tone: Tone) {
  return {
    stable: 'bg-[rgba(45,212,131,0.14)] text-[color:var(--seva)]',
    warning: 'bg-[rgba(246,167,42,0.14)] text-[color:var(--saffron)]',
    critical: 'bg-[rgba(255,92,122,0.14)] text-[color:var(--critical)]',
  }[tone]
}

function zoneCode(zone: Zone) {
  return zone.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()
}

function zoneById(zoneId: string) {
  return zones.find((zone) => zone.id === zoneId)
}

function Glass({
  children,
  className = '',
  label,
}: {
  children: ReactNode
  className?: string
  label?: string
}) {
  return (
    <section aria-label={label} className={`command-glass ${className}`}>
      {children}
    </section>
  )
}

function StatusPill({
  children,
  tone = 'stable',
}: {
  children: ReactNode
  tone?: Tone
}) {
  return (
    <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-[11px] font-black uppercase tracking-[0.08em] ${toneClass(tone)}`}>
      {children}
    </span>
  )
}

function LeftRail() {
  const items = [
    { icon: Map, label: 'Live map' },
    { icon: Brain, label: 'AI dispatch' },
    { icon: AlertTriangle, label: 'Incidents' },
    { icon: Users, label: 'Volunteers' },
    { icon: Layers3, label: 'Sectors' },
  ]

  return (
    <aside className="relative z-50 hidden h-full w-14 xl:block">
      <nav
        aria-label="Primary command navigation"
        className="command-glass group absolute inset-y-0 left-0 flex w-14 flex-col items-start overflow-hidden p-2 transition-[width] duration-200 hover:w-56 focus-within:w-56"
      >
        <div className="mb-6 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--seva)] text-[#06100c]">
          <Radio aria-hidden="true" size={18} />
        </div>

        <div className="grid w-full gap-2">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                className="command-focus flex h-10 w-full items-center gap-3 rounded-xl px-2 text-left text-[color:var(--muted)] transition-colors hover:bg-white/[0.04] hover:text-[color:var(--text)]"
                key={item.label}
                type="button"
              >
                <Icon aria-hidden="true" className="shrink-0" size={18} />
                <span className="whitespace-nowrap text-sm font-bold opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-auto w-full rounded-xl border border-white/[0.06] bg-black/20 p-2">
          <div className="flex items-center gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(56,189,248,0.14)] text-[color:var(--river)]">
              <Command aria-hidden="true" size={14} />
            </span>
            <span className="min-w-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <strong className="block truncate text-xs text-[color:var(--text)]">Keyboard first</strong>
              <span className="block truncate text-[11px] text-[color:var(--muted)]">1-6 zones, A incident</span>
            </span>
          </div>
        </div>
      </nav>
    </aside>
  )
}

function TopCommandBar({
  scenario,
  skillFilter,
  onModeChange,
  onScenarioChange,
  onSkillChange,
  onAddIncident,
}: {
  scenario: Scenario
  skillFilter: SkillFilter
  onModeChange: (mode: ScenarioMode) => void
  onScenarioChange: (scenario: Scenario) => void
  onSkillChange: (skill: SkillFilter) => void
  onAddIncident: () => void
}) {
  return (
    <Glass className="command-scrollbar flex min-h-16 items-center gap-2 overflow-x-auto overflow-y-hidden px-2" label="Top command bar">
      <div className="grid h-12 shrink-0 grid-cols-4 gap-1 rounded-2xl bg-black/20 p-1">
        {scenarioOrder.map((mode) => (
          <button
            aria-label={`Activate ${scenarioLabels[mode]} mode`}
            aria-keyshortcuts={`${scenarioOrder.indexOf(mode) + 1}`}
            className={`command-focus relative min-w-20 rounded-xl px-2 text-xs font-black transition-colors 2xl:min-w-24 2xl:text-sm ${
              scenario.mode === mode ? 'text-[#06100c]' : 'text-[color:var(--muted)] hover:text-[color:var(--text)]'
            }`}
            key={mode}
            onClick={() => onModeChange(mode)}
            type="button"
          >
            {scenario.mode === mode && (
              <motion.span
                className="absolute inset-0 rounded-xl bg-[color:var(--seva)]"
                layoutId="scenario-active"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{scenarioLabels[mode]}</span>
          </button>
        ))}
      </div>

      <label className="flex h-12 min-w-44 items-center gap-3 rounded-2xl bg-black/20 px-3">
        <ListFilter aria-hidden="true" className="text-[color:var(--muted)]" size={16} />
        <select
          aria-label="Skill filter"
          className="command-focus command-select min-w-0 flex-1 bg-transparent text-sm font-black text-[color:var(--text)]"
          onChange={(event) => onSkillChange(event.target.value as SkillFilter)}
          value={skillFilter}
        >
          <option>All Skills</option>
          {skills.map((skill) => (
            <option key={skill}>{skill}</option>
          ))}
        </select>
      </label>

      {[
        ['Crowd', 'crowdIntensity'],
        ['Heat', 'weatherStress'],
      ].map(([label, key]) => (
        <label className="flex h-12 min-w-32 items-center gap-3 rounded-2xl bg-black/20 px-3 2xl:min-w-40" key={key}>
          <span className="text-[11px] font-black uppercase tracking-[0.08em] text-[color:var(--muted)]">{label}</span>
          <input
            aria-label={`${label} pressure`}
            className="min-w-0 flex-1 accent-[color:var(--seva)]"
            max="100"
            min={key === 'weatherStress' ? '10' : '20'}
            onChange={(event) =>
              onScenarioChange({
                ...scenario,
                [key]: Number(event.target.value),
              })
            }
            type="range"
            value={scenario[key as keyof Pick<Scenario, 'crowdIntensity' | 'weatherStress'>]}
          />
          <strong className="tabular min-w-8 text-right text-sm text-[color:var(--text)]">
            {scenario[key as keyof Pick<Scenario, 'crowdIntensity' | 'weatherStress'>]}
          </strong>
        </label>
      ))}

      <button
        aria-keyshortcuts="A"
        className="command-focus ml-auto inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[rgba(45,212,131,0.28)] bg-[rgba(45,212,131,0.14)] px-4 text-sm font-black text-[color:var(--seva)] transition-colors hover:bg-[rgba(45,212,131,0.2)]"
        onClick={onAddIncident}
        type="button"
      >
        <Plus aria-hidden="true" size={16} />
        Incident
        <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-soft)]">
          A
        </span>
      </button>
    </Glass>
  )
}

function RouteLayer({ assignments }: { assignments: Assignment[] }) {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 size-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="deploymentRoute" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="var(--river)" stopOpacity="0.1" />
          <stop offset="55%" stopColor="var(--seva)" stopOpacity="0.58" />
          <stop offset="100%" stopColor="var(--saffron)" stopOpacity="0.42" />
        </linearGradient>
      </defs>
      {assignments.slice(0, 20).map((assignment, index) => {
        const origin = zoneById(assignment.volunteer.currentZone) ?? zoneById(assignment.volunteer.homeZone)
        if (!origin) return null
        const target = assignment.zone
        const midX = (origin.coordinates.x + target.coordinates.x) / 2
        const midY = (origin.coordinates.y + target.coordinates.y) / 2 - 8 - (index % 3) * 2
        const path = `M ${origin.coordinates.x} ${origin.coordinates.y} Q ${midX} ${midY} ${target.coordinates.x} ${target.coordinates.y}`

        return (
          <motion.path
            d={path}
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.68 }}
            key={`${assignment.volunteer.id}-${assignment.zone.id}`}
            stroke="url(#deploymentRoute)"
            strokeLinecap="round"
            strokeWidth={assignment.score > 70 ? 0.36 : 0.24}
            transition={{ delay: index * 0.025, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          />
        )
      })}
    </svg>
  )
}

function IncidentBeacons({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="absolute inset-0 z-20">
      {incidents
        .filter((incident) => incident.status !== 'assigned')
        .slice(0, 10)
        .map((incident, index) => {
          const zone = zoneById(incident.zoneId)
          if (!zone) return null
          const tone = incident.severity >= 5 ? 'critical' : incident.severity >= 3 ? 'warning' : 'stable'

          return (
            <span
              aria-label={`${incident.type} at ${zone.name}`}
              className={`absolute grid size-7 place-items-center rounded-full ${toneClass(tone)}`}
              key={incident.id}
              style={{
                left: `calc(${zone.coordinates.x}% + ${index % 2 === 0 ? 32 : -32}px)`,
                top: `calc(${zone.coordinates.y}% + ${index % 2 === 0 ? -32 : 24}px)`,
              }}
            >
              <span className="live-ping absolute inset-0 rounded-full border border-current" />
              <AlertTriangle aria-hidden="true" size={13} />
            </span>
          )
        })}
    </div>
  )
}

function MapNode({
  plan,
  selected,
  onSelect,
}: {
  plan: ZonePlan
  selected: boolean
  onSelect: () => void
}) {
  const tone = riskTone(plan.risk)

  return (
    <motion.button
      aria-label={`${plan.zone.name}. Risk ${plan.risk}. Coverage ${plan.coverage} percent. ${plan.assigned.length} deployed.`}
      className="command-focus absolute z-30 -translate-x-1/2 -translate-y-1/2"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: selected ? 1.04 : 1 }}
      onClick={onSelect}
      style={{
        left: `${plan.zone.coordinates.x}%`,
        top: `${plan.zone.coordinates.y}%`,
      }}
      type="button"
      whileHover={{ y: -2 }}
    >
      <span className={`absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full ${toneClass(tone)} opacity-20 ${selected ? 'scale-125' : ''}`} />
      <span className="command-glass relative hidden min-w-36 gap-1 p-3 text-left 2xl:grid">
        <span className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-black uppercase tracking-[0.1em] text-[color:var(--muted)]">{zoneCode(plan.zone)}</span>
          <span className={`tabular rounded-full px-2 py-0.5 text-[11px] font-black ${toneClass(tone)}`}>{plan.risk}</span>
        </span>
        <strong className="max-w-40 truncate text-sm font-black text-[color:var(--text)]">{plan.zone.name}</strong>
        <span className="tabular text-xs font-bold text-[color:var(--text-soft)]">
          {percent(plan.coverage)} / {plan.assigned.length} deployed
        </span>
        {selected && (
          <span className="mt-1 grid grid-cols-2 gap-2 text-[11px] font-bold text-[color:var(--muted)]">
            <span>D {plan.demand}</span>
            <span>T {plan.target}</span>
          </span>
        )}
      </span>
      <span className="command-glass relative grid size-16 place-items-center p-2 text-center 2xl:hidden">
        <strong className="text-xs font-black text-[color:var(--text)]">{zoneCode(plan.zone)}</strong>
        <span className={`tabular rounded-full px-1.5 py-0.5 text-[10px] font-black ${toneClass(tone)}`}>{plan.risk}</span>
      </span>
    </motion.button>
  )
}

function NodeInspector({ plan }: { plan: ZonePlan }) {
  const tone = riskTone(plan.risk)

  return (
    <motion.aside
      aria-label="Selected sector inspector"
      className="command-glass absolute bottom-4 left-4 z-40 hidden w-80 p-4 2xl:block"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      key={plan.zone.id}
      transition={{ duration: 0.18 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">{plan.zone.area}</p>
          <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">{plan.zone.name}</h2>
        </div>
        <StatusPill tone={tone}>{plan.risk} risk</StatusPill>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/[0.08]">
        {[
          ['Demand', plan.demand],
          ['Target', plan.target],
          ['Live', plan.assigned.length],
        ].map(([label, value]) => (
          <div className="bg-black/20 p-3" key={label}>
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[color:var(--muted)]">{label}</span>
            <strong className="tabular mt-1 block text-lg text-[color:var(--text)]">{value}</strong>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex justify-between text-xs font-bold text-[color:var(--muted)]">
          <span>Coverage</span>
          <span className="tabular">{percent(plan.coverage)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
          <motion.span
            animate={{ width: `${Math.min(100, plan.coverage)}%` }}
            className="block h-full rounded-full bg-[color:var(--seva)]"
            initial={false}
          />
        </div>
      </div>
    </motion.aside>
  )
}

function LiveMapCanvas({
  plan,
  selectedPlan,
  incidents,
  onSelectZone,
}: {
  plan: DeploymentPlan
  selectedPlan: ZonePlan
  incidents: Incident[]
  onSelectZone: (zoneId: string) => void
}) {
  return (
    <Glass className="relative h-full min-h-[560px] overflow-hidden p-0 xl:min-h-0" label="Live operational map">
      <div className="absolute inset-0 map-grid opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_54%_55%,rgba(45,212,131,0.11),transparent_24%),radial-gradient(circle_at_18%_78%,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(246,167,42,0.08),transparent_24%)]" />
      <div className="absolute -left-[14%] top-[52%] h-[11%] w-[135%] rotate-[10deg] rounded-full bg-[rgba(56,189,248,0.14)]" />
      <div className="absolute -left-[8%] top-[64%] h-[6%] w-[126%] -rotate-[16deg] rounded-full bg-[rgba(56,189,248,0.11)]" />
      <div className="absolute left-[34%] top-[6%] h-[90%] w-3 rotate-[18deg] rounded-full bg-white/[0.05]" />
      <div className="absolute left-[4%] top-[75%] h-3 w-[92%] -rotate-[6deg] rounded-full bg-white/[0.05]" />

      <div className="pointer-events-none absolute left-6 top-6 z-40">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[color:var(--muted)]">
          Mahakumbh Live Operations
        </p>
        <h1 className="mt-1 text-3xl font-black leading-none text-[color:var(--text)]">SevaGrid Command</h1>
      </div>

      <RouteLayer assignments={plan.assignments} />
      <IncidentBeacons incidents={incidents} />

      <div className="absolute inset-0 z-30">
        {plan.zonePlans.map((zonePlan) => (
          <MapNode
            key={zonePlan.zone.id}
            onSelect={() => onSelectZone(zonePlan.zone.id)}
            plan={zonePlan}
            selected={zonePlan.zone.id === selectedPlan.zone.id}
          />
        ))}
      </div>

      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 hidden size-full 2xl:block" preserveAspectRatio="none" viewBox="0 0 100 100">
        <motion.line
          animate={{ x2: selectedPlan.zone.coordinates.x, y2: selectedPlan.zone.coordinates.y }}
          initial={false}
          stroke="var(--seva)"
          strokeDasharray="1 1"
          strokeOpacity="0.36"
          strokeWidth="0.16"
          x1="16"
          y1="78"
        />
      </svg>

      <NodeInspector plan={selectedPlan} />
    </Glass>
  )
}

function AIRecommendations({
  plan,
  assignments,
  scenario,
}: {
  plan: DeploymentPlan
  assignments: Assignment[]
  scenario: Scenario
}) {
  const recommendation = plan.zonePlans.find((zonePlan) => zonePlan.coverage < 75) ?? plan.zonePlans[0]

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">
            {scenarioLabels[scenario.mode]} guidance
          </span>
          <Sparkles aria-hidden="true" className="text-[color:var(--saffron)]" size={17} />
        </div>
        <p className="mt-3 text-sm leading-6 text-[color:var(--text-soft)]">{scenarioNotes[scenario.mode]}</p>
        <p className="mt-3 text-sm font-bold leading-6 text-[color:var(--text)]">
          Move one mobile responder toward {recommendation.zone.name}; coverage is {percent(recommendation.coverage)}
          {recommendation.missingSkills.length > 0 ? ` with ${recommendation.missingSkills[0]} uncovered.` : '.'}
        </p>
      </div>

      <div className="grid gap-2">
        {assignments.slice(0, 7).map((assignment) => {
          const Icon = skillIcons[assignment.primarySkill]
          return (
            <article className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-black/20 p-3" key={`${assignment.volunteer.id}-${assignment.zone.id}`}>
              <span className="grid size-8 place-items-center rounded-xl bg-[rgba(45,212,131,0.12)] text-[color:var(--seva)]">
                <Icon aria-hidden="true" size={15} />
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm text-[color:var(--text)]">{assignment.volunteer.name}</strong>
                <span className="block truncate text-xs text-[color:var(--muted)]">
                  {zoneCode(assignment.zone)} - {assignment.reason}
                </span>
              </span>
              <span className="tabular rounded-lg bg-[rgba(45,212,131,0.12)] px-2 py-1 text-sm font-black text-[color:var(--seva)]">
                {assignment.score}
              </span>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function IncidentQueue({
  incidents,
  onSend,
}: {
  incidents: Incident[]
  onSend: (incidentId: string) => void
}) {
  return (
    <div className="grid gap-2">
      {incidents.slice(0, 9).map((incident) => {
        const zone = zoneById(incident.zoneId)
        const tone = incident.severity >= 5 ? 'critical' : incident.severity >= 3 ? 'warning' : 'stable'
        return (
          <article className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-black/20 p-3" key={incident.id}>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className={`size-2.5 shrink-0 rounded-full ${toneClass(tone)}`} />
                <strong className="truncate text-sm text-[color:var(--text)]">{incident.type}</strong>
              </span>
              <span className="mt-1 block truncate text-xs text-[color:var(--muted)]">
                {zone ? zoneCode(zone) : 'UNK'} - {incident.requiredSkill} - {incident.ageMinutes}m
              </span>
            </span>
            <button
              className="command-focus min-h-8 rounded-xl bg-white/[0.05] px-3 text-xs font-black text-[color:var(--text)] disabled:text-[color:var(--seva)]"
              disabled={incident.status === 'assigned'}
              onClick={() => onSend(incident.id)}
              type="button"
            >
              {incident.status === 'assigned' ? 'Sent' : 'Send'}
            </button>
          </article>
        )
      })}
    </div>
  )
}

function VolunteerSuggestions({ assignments, bench }: { assignments: Assignment[]; bench: Volunteer[] }) {
  return (
    <div className="grid gap-4">
      <div>
        <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">
          Deployment suggestions
        </h3>
        <div className="grid gap-2">
          {assignments.slice(0, 5).map((assignment) => (
            <article className="rounded-2xl bg-black/20 p-3" key={`${assignment.volunteer.id}-${assignment.zone.id}`}>
              <div className="flex items-center justify-between gap-3">
                <strong className="truncate text-sm text-[color:var(--text)]">{assignment.volunteer.name}</strong>
                <span className="tabular text-sm font-black text-[color:var(--seva)]">{assignment.score}</span>
              </div>
              <span className="mt-1 block truncate text-xs text-[color:var(--muted)]">
                {assignment.zone.name} - {assignment.primarySkill}
              </span>
            </article>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">
          Reserve pool
        </h3>
        <div className="grid gap-2">
          {bench.slice(0, 4).map((volunteer) => (
            <article className="rounded-2xl bg-black/20 p-3" key={volunteer.id}>
              <strong className="block truncate text-sm text-[color:var(--text)]">{volunteer.name}</strong>
              <span className="mt-1 block truncate text-xs text-[color:var(--muted)]">
                {volunteer.skills[0]} - {volunteer.fatigue}% fatigue
              </span>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

function RightOperationsPanel({
  activeTab,
  onTabChange,
  plan,
  assignments,
  scenario,
  incidents,
  onSendIncident,
}: {
  activeTab: OperationsTab
  onTabChange: (tab: OperationsTab) => void
  plan: DeploymentPlan
  assignments: Assignment[]
  scenario: Scenario
  incidents: Incident[]
  onSendIncident: (incidentId: string) => void
}) {
  const tabs: Array<{ id: OperationsTab; label: string; icon: typeof Brain; tone?: Tone }> = [
    { id: 'ai', label: 'AI', icon: Brain },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle, tone: 'warning' },
    { id: 'volunteers', label: 'Volunteers', icon: Users },
  ]

  return (
    <Glass className="flex min-h-[480px] flex-col overflow-hidden p-3 xl:min-h-0" label="Right operations panel">
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-black/20 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              className={`command-focus flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-black transition-colors ${
                activeTab === tab.id ? 'bg-white/[0.09] text-[color:var(--text)]' : 'text-[color:var(--muted)] hover:text-[color:var(--text)]'
              }`}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              type="button"
            >
              <Icon aria-hidden="true" className={tab.tone ? toneClass(tab.tone).split(' ')[1] : ''} size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-auto pr-1">
        {activeTab === 'ai' && <AIRecommendations assignments={assignments} plan={plan} scenario={scenario} />}
        {activeTab === 'incidents' && <IncidentQueue incidents={incidents} onSend={onSendIncident} />}
        {activeTab === 'volunteers' && <VolunteerSuggestions assignments={assignments} bench={plan.bench} />}
      </div>
    </Glass>
  )
}

function ActivityLayer({
  collapsed,
  onToggle,
  plan,
  incidents,
}: {
  collapsed: boolean
  onToggle: () => void
  plan: DeploymentPlan
  incidents: Incident[]
}) {
  const events = [
    ...plan.assignments.slice(0, 5).map((assignment) => ({
      id: `${assignment.volunteer.id}-${assignment.zone.id}`,
      title: `${assignment.volunteer.name} routed to ${assignment.zone.name}`,
      meta: assignment.reason,
      icon: Route,
    })),
    ...incidents.slice(0, 3).map((incident) => ({
      id: incident.id,
      title: incident.type,
      meta: `${incident.requiredSkill} - ${incident.ageMinutes}m`,
      icon: AlertTriangle,
    })),
  ]

  return (
    <Glass className="overflow-hidden p-2" label="Bottom activity layer">
      <div className="flex h-full min-h-12 items-center gap-3">
        <button
          aria-label={collapsed ? 'Expand activity timeline' : 'Collapse activity timeline'}
          className="command-focus grid size-10 shrink-0 place-items-center rounded-2xl bg-white/[0.05] text-[color:var(--text)]"
          onClick={onToggle}
          type="button"
        >
          {collapsed ? <PanelBottomOpen aria-hidden="true" size={17} /> : <PanelBottomClose aria-hidden="true" size={17} />}
        </button>

        <div className="min-w-36">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">Activity</p>
          <strong className="tabular text-sm text-[color:var(--text)]">{events.length} live events</strong>
        </div>

        <div className={`grid min-w-0 flex-1 gap-2 ${collapsed ? 'grid-cols-3 xl:grid-cols-5' : 'grid-cols-1 xl:grid-cols-3'}`}>
          {events.slice(0, collapsed ? 5 : 9).map((event) => {
            const Icon = event.icon
            return (
              <article className="min-w-0 rounded-2xl bg-black/20 p-3" key={event.id}>
                <div className="flex min-w-0 items-center gap-2">
                  <Icon aria-hidden="true" className="shrink-0 text-[color:var(--river)]" size={14} />
                  <strong className="truncate text-sm text-[color:var(--text)]">{event.title}</strong>
                </div>
                {!collapsed && <span className="mt-1 block truncate text-xs text-[color:var(--muted)]">{event.meta}</span>}
              </article>
            )
          })}
        </div>
      </div>
    </Glass>
  )
}

function CompactSectorInspector({
  selectedPlan,
}: {
  selectedPlan: ZonePlan
}) {
  const tone = riskTone(selectedPlan.risk)

  return (
    <Glass className="p-4 xl:hidden" label="Compact selected sector inspector">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">
            {selectedPlan.zone.area}
          </p>
          <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">{selectedPlan.zone.name}</h2>
        </div>
        <StatusPill tone={tone}>{selectedPlan.risk} risk</StatusPill>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/[0.08]">
        {[
          ['Demand', selectedPlan.demand],
          ['Target', selectedPlan.target],
          ['Live', selectedPlan.assigned.length],
        ].map(([label, value]) => (
          <div className="bg-black/20 p-3" key={label}>
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[color:var(--muted)]">{label}</span>
            <strong className="tabular mt-1 block text-lg text-[color:var(--text)]">{value}</strong>
          </div>
        ))}
      </div>
    </Glass>
  )
}

export default function Home() {
  const [scenario, setScenario] = useState<Scenario>({
    mode: 'snan-surge',
    ...scenarioDefaults['snan-surge'],
  })
  const [incidents, setIncidents] = useState<Incident[]>(seedIncidents)
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0].id)
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('All Skills')
  const [activeTab, setActiveTab] = useState<OperationsTab>('ai')
  const [activityCollapsed, setActivityCollapsed] = useState(true)
  const reduceMotion = useReducedMotion()

  const plan = useMemo(
    () => createDeploymentPlan(volunteers, zones, incidents, scenario),
    [incidents, scenario],
  )

  const selectedPlan = plan.zonePlans.find((zonePlan) => zonePlan.zone.id === selectedZoneId) ?? plan.zonePlans[0]
  const assignments = plan.assignments.filter((assignment) =>
    skillFilter === 'All Skills' ? true : assignment.volunteer.skills.includes(skillFilter),
  )
  const highRiskZones = plan.zonePlans.filter((zonePlan) => zonePlan.risk >= 70).length
  const openIncidents = incidents.filter((incident) => incident.status !== 'assigned').length
  const activeVolunteers = volunteers.filter(
    (volunteer) => volunteer.status === 'available' || volunteer.status === 'assigned',
  ).length

  const changeMode = useCallback((mode: ScenarioMode) => {
    setScenario({
      mode,
      ...scenarioDefaults[mode],
    })
  }, [])

  const addIncident = useCallback(() => {
    const template = incidentTemplates[incidents.length % incidentTemplates.length]
    const incident: Incident = {
      ...template,
      id: `inc-${Date.now()}`,
      ageMinutes: 1,
      status: 'queued',
    }

    setIncidents((items) => [incident, ...items])
    setSelectedZoneId(template.zoneId)
    setActiveTab('incidents')
  }, [incidents.length])

  const sendIncident = useCallback((incidentId: string) => {
    setIncidents((items) =>
      items.map((incident) =>
        incident.id === incidentId
          ? {
              ...incident,
              status: 'assigned',
            }
          : incident,
      ),
    )
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
        return
      }

      const numericIndex = Number(event.key) - 1
      if (numericIndex >= 0 && numericIndex < plan.zonePlans.length) {
        event.preventDefault()
        setSelectedZoneId(plan.zonePlans[numericIndex].zone.id)
      }

      if (event.key === 'ArrowRight' || event.key === ']') {
        event.preventDefault()
        const index = scenarioOrder.indexOf(scenario.mode)
        changeMode(scenarioOrder[(index + 1) % scenarioOrder.length])
      }

      if (event.key === 'ArrowLeft' || event.key === '[') {
        event.preventDefault()
        const index = scenarioOrder.indexOf(scenario.mode)
        changeMode(scenarioOrder[(index - 1 + scenarioOrder.length) % scenarioOrder.length])
      }

      if (event.key.toLowerCase() === 'a') {
        event.preventDefault()
        addIncident()
      }

      if (event.key.toLowerCase() === 't') {
        event.preventDefault()
        setActivityCollapsed((current) => !current)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [addIncident, changeMode, plan.zonePlans, scenario.mode])

  return (
    <main className="theme-dark min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text)]">
      <div
        className="grid min-h-screen gap-4 p-4 xl:h-screen xl:[grid-template-columns:var(--command-columns)] xl:[grid-template-rows:var(--command-rows)] xl:overflow-hidden"
        style={{
          '--command-columns': '56px minmax(0, 1fr) clamp(384px, 20vw, 768px)',
          '--command-rows': activityCollapsed ? '64px minmax(0,1fr) 64px' : '64px minmax(0,1fr) 176px',
        } as CSSProperties}
      >
        <LeftRail />

        <div className="min-w-0 xl:col-start-2 xl:row-start-1">
          <TopCommandBar
            onAddIncident={addIncident}
            onModeChange={changeMode}
            onScenarioChange={setScenario}
            onSkillChange={setSkillFilter}
            scenario={scenario}
            skillFilter={skillFilter}
          />
        </div>

        <div className="flex items-center justify-end gap-2 xl:col-start-3 xl:row-start-1">
          <StatusPill>
            <Clock3 aria-hidden="true" size={13} />
            06:00-14:00
          </StatusPill>
          <StatusPill tone={highRiskZones > 3 ? 'critical' : 'warning'}>
            <Satellite aria-hidden="true" size={13} />
            {highRiskZones} hot
          </StatusPill>
          <StatusPill>
            <Users aria-hidden="true" size={13} />
            {activeVolunteers}/{volunteers.length}
          </StatusPill>
          <StatusPill tone={openIncidents > 3 ? 'critical' : 'warning'}>
            <Zap aria-hidden="true" size={13} />
            {openIncidents}
          </StatusPill>
        </div>

        <section className="min-w-0 xl:col-start-2 xl:row-start-2" aria-label="Map workspace">
          <LiveMapCanvas
            incidents={incidents}
            onSelectZone={setSelectedZoneId}
            plan={plan}
            selectedPlan={selectedPlan}
          />
        </section>

        <div className="xl:hidden">
          <CompactSectorInspector selectedPlan={selectedPlan} />
        </div>

        <aside className="min-w-0 xl:col-start-3 xl:row-start-2 xl:row-span-2" aria-label="Operations sidebar">
          <RightOperationsPanel
            activeTab={activeTab}
            assignments={assignments}
            incidents={incidents}
            onSendIncident={sendIncident}
            onTabChange={setActiveTab}
            plan={plan}
            scenario={scenario}
          />
        </aside>

        <div className="min-w-0 xl:col-start-2 xl:row-start-3">
          <ActivityLayer
            collapsed={activityCollapsed}
            incidents={incidents}
            onToggle={() => setActivityCollapsed((current) => !current)}
            plan={plan}
          />
        </div>

      </div>

      <div aria-live="polite" className="sr-only">
        {selectedPlan.zone.name} selected. Coverage {selectedPlan.coverage} percent. Risk {selectedPlan.risk}.
        {reduceMotion ? ' Reduced motion is active.' : ''}
      </div>
    </main>
  )
}
