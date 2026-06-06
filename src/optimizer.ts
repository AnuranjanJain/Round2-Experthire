import type { Incident, Scenario, Skill, Volunteer, Zone } from './data'

export type Assignment = {
  volunteer: Volunteer
  zone: Zone
  score: number
  reason: string
  primarySkill: Skill
}

export type ZonePlan = {
  zone: Zone
  target: number
  demand: number
  risk: number
  assigned: Assignment[]
  missingSkills: Skill[]
  coverage: number
}

export type DeploymentPlan = {
  zonePlans: ZonePlan[]
  assignments: Assignment[]
  bench: Volunteer[]
  unavailable: Volunteer[]
  coverageScore: number
  fairnessScore: number
  workloadAverage: number
  criticalGaps: number
}

const scenarioDemandBoost: Record<Scenario['mode'], Partial<Record<Zone['category'], number>>> = {
  balanced: {
    Ghat: 4,
    Transit: 2,
    Camp: 1,
    Command: 1,
  },
  'snan-surge': {
    Ghat: 22,
    Transit: 16,
    Camp: 4,
    Command: 6,
  },
  'heat-alert': {
    Ghat: 10,
    Transit: 8,
    Camp: 17,
    Command: 5,
  },
  'missing-person': {
    Ghat: 6,
    Transit: 10,
    Camp: 4,
    Command: 21,
  },
}

const scenarioSkillBoost: Record<Scenario['mode'], Partial<Record<Skill, number>>> = {
  balanced: {},
  'snan-surge': {
    'Crowd Guidance': 15,
    Logistics: 8,
  },
  'heat-alert': {
    'Medical Aid': 14,
    'Water Relief': 14,
  },
  'missing-person': {
    'Child Support': 18,
    'Language Support': 10,
  },
}

const unique = <T>(items: T[]) => Array.from(new Set(items))

export function calculateDemand(zone: Zone, incidents: Incident[], scenario: Scenario) {
  const localIncidents = incidents.filter((incident) => incident.zoneId === zone.id)
  const incidentPressure = localIncidents.reduce(
    (total, incident) => total + incident.severity * 7 + Math.max(0, 24 - incident.ageMinutes) / 3,
    0,
  )
  const categoryBoost = scenarioDemandBoost[scenario.mode][zone.category] ?? 0
  const crowdPressure = Math.round((zone.crowdLoad * scenario.crowdIntensity) / 100)
  const weatherPressure = Math.round((scenario.weatherStress / 100) * 10)

  return Math.round(zone.baseDemand + incidentPressure + categoryBoost + crowdPressure + weatherPressure)
}

function zoneRisk(zone: Zone, incidents: Incident[], scenario: Scenario) {
  const demand = calculateDemand(zone, incidents, scenario)
  const incidentSeverity = incidents
    .filter((incident) => incident.zoneId === zone.id)
    .reduce((total, incident) => total + incident.severity, 0)

  return Math.min(
    100,
    Math.round(demand * 0.32 + zone.priority * 3 + incidentSeverity * 4 + scenario.weatherStress * 0.1),
  )
}

function zoneTarget(zone: Zone, demand: number, risk: number) {
  return Math.max(zone.minVolunteers, Math.ceil(demand / 68) + Math.ceil(risk / 50))
}

function movementCost(volunteer: Volunteer, zone: Zone) {
  const sameCurrentZone = volunteer.currentZone === zone.id
  const sameHomeZone = volunteer.homeZone === zone.id

  if (sameCurrentZone) {
    return 0
  }

  if (sameHomeZone) {
    return 6
  }

  return volunteer.preference === 'mobile' ? 10 : 16
}

function pickPrimarySkill(volunteer: Volunteer, zone: Zone, incidents: Incident[], scenario: Scenario): Skill {
  const incidentSkill = incidents.find(
    (incident) => incident.zoneId === zone.id && volunteer.skills.includes(incident.requiredSkill),
  )?.requiredSkill

  if (incidentSkill) {
    return incidentSkill
  }

  const boostedSkill = zone.requiredSkills
    .filter((skill) => volunteer.skills.includes(skill))
    .sort((a, b) => (scenarioSkillBoost[scenario.mode][b] ?? 0) - (scenarioSkillBoost[scenario.mode][a] ?? 0))[0]

  return boostedSkill ?? volunteer.skills[0]
}

function scoreVolunteer(volunteer: Volunteer, zone: Zone, incidents: Incident[], scenario: Scenario) {
  const localIncidents = incidents.filter((incident) => incident.zoneId === zone.id)
  const matchingSkills = volunteer.skills.filter((skill) => zone.requiredSkills.includes(skill))
  const incidentMatch = localIncidents.some((incident) => volunteer.skills.includes(incident.requiredSkill))
  const languageBoost = volunteer.languages.length >= 3 || volunteer.skills.includes('Language Support') ? 8 : 0
  const continuityBoost = volunteer.currentZone === zone.id ? 7 : 0
  const mobilityBoost = volunteer.preference === 'mobile' && zone.category === 'Transit' ? 5 : 0
  const deskBoost = volunteer.preference === 'desk' && zone.category === 'Command' ? 7 : 0
  const skillBoost = volunteer.skills.reduce(
    (total, skill) => total + (scenarioSkillBoost[scenario.mode][skill] ?? 0),
    0,
  )
  const fatiguePenalty = volunteer.fatigue * 0.36
  const shiftPenalty = volunteer.shiftsToday * 5.5
  const distancePenalty = movementCost(volunteer, zone)

  return Math.round(
    matchingSkills.length * 27 +
      (incidentMatch ? 18 : 0) +
      languageBoost +
      continuityBoost +
      mobilityBoost +
      deskBoost +
      skillBoost -
      fatiguePenalty -
      shiftPenalty -
      distancePenalty,
  )
}

function explainAssignment(volunteer: Volunteer, zone: Zone, incidents: Incident[], scenario: Scenario) {
  const primarySkill = pickPrimarySkill(volunteer, zone, incidents, scenario)
  const reasons: string[] = [primarySkill]

  if (volunteer.currentZone === zone.id) {
    reasons.push('already nearby')
  } else if (volunteer.preference === 'mobile') {
    reasons.push('mobile responder')
  }

  if (volunteer.fatigue <= 35) {
    reasons.push('fresh shift')
  }

  if (scenarioSkillBoost[scenario.mode][primarySkill]) {
    reasons.push('scenario priority')
  }

  return reasons.slice(0, 3).join(' + ')
}

export function createDeploymentPlan(
  allVolunteers: Volunteer[],
  allZones: Zone[],
  allIncidents: Incident[],
  scenario: Scenario,
): DeploymentPlan {
  const available = allVolunteers.filter(
    (volunteer) => volunteer.status === 'available' || volunteer.status === 'assigned',
  )
  const unavailable = allVolunteers.filter(
    (volunteer) => volunteer.status === 'resting' || volunteer.status === 'training',
  )

  const seedPlans: ZonePlan[] = allZones
    .map((zone) => {
      const demand = calculateDemand(zone, allIncidents, scenario)
      const risk = zoneRisk(zone, allIncidents, scenario)

      return {
        zone,
        target: zoneTarget(zone, demand, risk),
        demand,
        risk,
        assigned: [],
        missingSkills: [],
        coverage: 0,
      }
    })
    .sort((a, b) => b.risk + b.zone.priority * 4 - (a.risk + a.zone.priority * 4))

  const unassigned = new Map(available.map((volunteer) => [volunteer.id, volunteer]))
  const assignments: Assignment[] = []

  let guard = 0

  while (unassigned.size > 0 && guard < 200) {
    guard += 1

    const plan = seedPlans
      .filter((candidate) => candidate.assigned.length < candidate.target)
      .sort((a, b) => {
        const aGap = (a.target - a.assigned.length) / a.target
        const bGap = (b.target - b.assigned.length) / b.target

        return b.risk + bGap * 36 + b.zone.priority * 2 - (a.risk + aGap * 36 + a.zone.priority * 2)
      })[0]

    if (!plan) {
      break
    }

      const scored = Array.from(unassigned.values())
        .map((volunteer) => ({
          volunteer,
          score: scoreVolunteer(volunteer, plan.zone, allIncidents, scenario),
        }))
        .filter(({ score }) => score > -25)
        .sort((a, b) => b.score - a.score)

      const best = scored[0]

      if (!best) {
        break
      }

      const primarySkill = pickPrimarySkill(best.volunteer, plan.zone, allIncidents, scenario)
      const assignment: Assignment = {
        volunteer: best.volunteer,
        zone: plan.zone,
        score: best.score,
        reason: explainAssignment(best.volunteer, plan.zone, allIncidents, scenario),
        primarySkill,
      }

      plan.assigned.push(assignment)
      assignments.push(assignment)
      unassigned.delete(best.volunteer.id)
  }

  const zonePlans = seedPlans.map((plan) => {
    const coveredSkills = unique(plan.assigned.flatMap((assignment) => assignment.volunteer.skills))
    const missingSkills = plan.zone.requiredSkills.filter((skill) => !coveredSkills.includes(skill))
    const coverage = Math.min(100, Math.round((plan.assigned.length / plan.target) * 100))

    return {
      ...plan,
      missingSkills,
      coverage,
    }
  })

  const coverageScore = Math.round(
    zonePlans.reduce((total, plan) => total + plan.coverage * (plan.zone.priority / 10), 0) /
      zonePlans.reduce((total, plan) => total + plan.zone.priority / 10, 0),
  )
  const workloadAverage = Math.round(
    assignments.reduce((total, assignment) => total + assignment.volunteer.fatigue, 0) /
      Math.max(assignments.length, 1),
  )
  const fairnessScore = Math.max(
    0,
    Math.round(100 - workloadAverage * 0.45 - assignments.filter((a) => a.volunteer.shiftsToday >= 3).length * 4),
  )

  return {
    zonePlans: zonePlans.sort((a, b) => b.risk - a.risk),
    assignments,
    bench: Array.from(unassigned.values()).sort((a, b) => a.fatigue - b.fatigue),
    unavailable,
    coverageScore,
    fairnessScore,
    workloadAverage,
    criticalGaps: zonePlans.filter((plan) => plan.coverage < 75 || plan.missingSkills.length > 0).length,
  }
}
