export type Skill =
  | 'Crowd Guidance'
  | 'Medical Aid'
  | 'Language Support'
  | 'Logistics'
  | 'Security Liaison'
  | 'Child Support'
  | 'Water Relief'

export type VolunteerStatus = 'available' | 'assigned' | 'resting' | 'training'

export type Volunteer = {
  id: string
  name: string
  badge: string
  homeZone: string
  currentZone: string
  skills: Skill[]
  languages: string[]
  fatigue: number
  shiftsToday: number
  status: VolunteerStatus
  preference: 'field' | 'desk' | 'mobile'
}

export type Zone = {
  id: string
  name: string
  area: string
  category: 'Ghat' | 'Transit' | 'Camp' | 'Command'
  requiredSkills: Skill[]
  baseDemand: number
  crowdLoad: number
  priority: number
  minVolunteers: number
  coordinates: {
    x: number
    y: number
  }
}

export type Incident = {
  id: string
  zoneId: string
  type: string
  severity: number
  requiredSkill: Skill
  ageMinutes: number
  status: 'queued' | 'triaged' | 'assigned'
}

export type ScenarioMode = 'balanced' | 'snan-surge' | 'heat-alert' | 'missing-person'

export type Scenario = {
  mode: ScenarioMode
  crowdIntensity: number
  weatherStress: number
}

export const scenarioLabels: Record<ScenarioMode, string> = {
  balanced: 'Balanced',
  'snan-surge': 'Snan Surge',
  'heat-alert': 'Heat Alert',
  'missing-person': 'Missing Person',
}

export const scenarioNotes: Record<ScenarioMode, string> = {
  balanced: 'Stable crowd flow across major operating zones.',
  'snan-surge': 'Sharp demand near ghats and transit corridors.',
  'heat-alert': 'Medical and water support demand rises across field zones.',
  'missing-person': 'Child support and language assistance get priority.',
}

export const zones: Zone[] = [
  {
    id: 'sangam-ghat',
    name: 'Sangam Ghat',
    area: 'Sector 4',
    category: 'Ghat',
    requiredSkills: ['Crowd Guidance', 'Medical Aid', 'Water Relief'],
    baseDemand: 86,
    crowdLoad: 91,
    priority: 10,
    minVolunteers: 5,
    coordinates: { x: 67, y: 58 },
  },
  {
    id: 'akshayavat',
    name: 'Akshayavat Queue',
    area: 'Sector 2',
    category: 'Ghat',
    requiredSkills: ['Crowd Guidance', 'Language Support'],
    baseDemand: 62,
    crowdLoad: 73,
    priority: 8,
    minVolunteers: 3,
    coordinates: { x: 48, y: 33 },
  },
  {
    id: 'rail-arrival',
    name: 'Rail Arrival Gate',
    area: 'Transit Hub',
    category: 'Transit',
    requiredSkills: ['Crowd Guidance', 'Logistics', 'Language Support'],
    baseDemand: 77,
    crowdLoad: 85,
    priority: 9,
    minVolunteers: 5,
    coordinates: { x: 18, y: 64 },
  },
  {
    id: 'bus-corridor',
    name: 'Bus Corridor',
    area: 'Outer Ring',
    category: 'Transit',
    requiredSkills: ['Logistics', 'Security Liaison'],
    baseDemand: 58,
    crowdLoad: 68,
    priority: 7,
    minVolunteers: 3,
    coordinates: { x: 29, y: 79 },
  },
  {
    id: 'kalpvas-camp',
    name: 'Kalpvas Camp',
    area: 'Sector 11',
    category: 'Camp',
    requiredSkills: ['Medical Aid', 'Water Relief', 'Language Support'],
    baseDemand: 44,
    crowdLoad: 49,
    priority: 5,
    minVolunteers: 3,
    coordinates: { x: 76, y: 26 },
  },
  {
    id: 'lost-helpdesk',
    name: 'Lost Helpdesk',
    area: 'Central Control',
    category: 'Command',
    requiredSkills: ['Child Support', 'Language Support', 'Security Liaison'],
    baseDemand: 53,
    crowdLoad: 61,
    priority: 9,
    minVolunteers: 4,
    coordinates: { x: 56, y: 72 },
  },
]

export const volunteers: Volunteer[] = [
  {
    id: 'v-101',
    name: 'Ananya Rao',
    badge: 'MKB-101',
    homeZone: 'sangam-ghat',
    currentZone: 'sangam-ghat',
    skills: ['Crowd Guidance', 'Medical Aid'],
    languages: ['Hindi', 'English', 'Telugu'],
    fatigue: 22,
    shiftsToday: 1,
    status: 'available',
    preference: 'field',
  },
  {
    id: 'v-102',
    name: 'Kabir Khan',
    badge: 'MKB-102',
    homeZone: 'rail-arrival',
    currentZone: 'rail-arrival',
    skills: ['Logistics', 'Language Support'],
    languages: ['Hindi', 'English', 'Bengali'],
    fatigue: 34,
    shiftsToday: 1,
    status: 'available',
    preference: 'mobile',
  },
  {
    id: 'v-103',
    name: 'Meera Iyer',
    badge: 'MKB-103',
    homeZone: 'lost-helpdesk',
    currentZone: 'lost-helpdesk',
    skills: ['Child Support', 'Language Support'],
    languages: ['Hindi', 'Tamil', 'English'],
    fatigue: 18,
    shiftsToday: 0,
    status: 'available',
    preference: 'desk',
  },
  {
    id: 'v-104',
    name: 'Raghav Mishra',
    badge: 'MKB-104',
    homeZone: 'akshayavat',
    currentZone: 'akshayavat',
    skills: ['Crowd Guidance', 'Security Liaison'],
    languages: ['Hindi', 'English'],
    fatigue: 57,
    shiftsToday: 2,
    status: 'assigned',
    preference: 'field',
  },
  {
    id: 'v-105',
    name: 'Fatima Sheikh',
    badge: 'MKB-105',
    homeZone: 'kalpvas-camp',
    currentZone: 'kalpvas-camp',
    skills: ['Medical Aid', 'Water Relief'],
    languages: ['Hindi', 'Urdu', 'English'],
    fatigue: 46,
    shiftsToday: 2,
    status: 'available',
    preference: 'field',
  },
  {
    id: 'v-106',
    name: 'Arjun Singh',
    badge: 'MKB-106',
    homeZone: 'bus-corridor',
    currentZone: 'bus-corridor',
    skills: ['Logistics', 'Security Liaison'],
    languages: ['Hindi', 'Punjabi'],
    fatigue: 39,
    shiftsToday: 1,
    status: 'available',
    preference: 'mobile',
  },
  {
    id: 'v-107',
    name: 'Nisha Patel',
    badge: 'MKB-107',
    homeZone: 'rail-arrival',
    currentZone: 'sangam-ghat',
    skills: ['Crowd Guidance', 'Language Support'],
    languages: ['Hindi', 'Gujarati', 'English'],
    fatigue: 63,
    shiftsToday: 2,
    status: 'available',
    preference: 'field',
  },
  {
    id: 'v-108',
    name: 'Dev Verma',
    badge: 'MKB-108',
    homeZone: 'lost-helpdesk',
    currentZone: 'lost-helpdesk',
    skills: ['Child Support', 'Medical Aid'],
    languages: ['Hindi', 'English'],
    fatigue: 71,
    shiftsToday: 3,
    status: 'resting',
    preference: 'desk',
  },
  {
    id: 'v-109',
    name: 'Sana Qureshi',
    badge: 'MKB-109',
    homeZone: 'akshayavat',
    currentZone: 'akshayavat',
    skills: ['Language Support', 'Water Relief'],
    languages: ['Hindi', 'Urdu', 'Bengali', 'English'],
    fatigue: 29,
    shiftsToday: 1,
    status: 'available',
    preference: 'mobile',
  },
  {
    id: 'v-110',
    name: 'Harsh Tiwari',
    badge: 'MKB-110',
    homeZone: 'sangam-ghat',
    currentZone: 'sangam-ghat',
    skills: ['Crowd Guidance', 'Security Liaison'],
    languages: ['Hindi'],
    fatigue: 51,
    shiftsToday: 2,
    status: 'available',
    preference: 'field',
  },
  {
    id: 'v-111',
    name: 'Priya Menon',
    badge: 'MKB-111',
    homeZone: 'kalpvas-camp',
    currentZone: 'kalpvas-camp',
    skills: ['Medical Aid', 'Language Support'],
    languages: ['Hindi', 'Malayalam', 'English'],
    fatigue: 15,
    shiftsToday: 0,
    status: 'available',
    preference: 'field',
  },
  {
    id: 'v-112',
    name: 'Vikram Sahu',
    badge: 'MKB-112',
    homeZone: 'bus-corridor',
    currentZone: 'rail-arrival',
    skills: ['Logistics', 'Crowd Guidance'],
    languages: ['Hindi', 'Odia'],
    fatigue: 68,
    shiftsToday: 3,
    status: 'available',
    preference: 'mobile',
  },
  {
    id: 'v-113',
    name: 'Ishita Das',
    badge: 'MKB-113',
    homeZone: 'lost-helpdesk',
    currentZone: 'rail-arrival',
    skills: ['Child Support', 'Language Support', 'Crowd Guidance'],
    languages: ['Hindi', 'Bengali', 'English'],
    fatigue: 26,
    shiftsToday: 1,
    status: 'available',
    preference: 'desk',
  },
  {
    id: 'v-114',
    name: 'Om Prakash',
    badge: 'MKB-114',
    homeZone: 'sangam-ghat',
    currentZone: 'bus-corridor',
    skills: ['Water Relief', 'Logistics'],
    languages: ['Hindi', 'English'],
    fatigue: 42,
    shiftsToday: 1,
    status: 'available',
    preference: 'mobile',
  },
  {
    id: 'v-115',
    name: 'Lata Kumari',
    badge: 'MKB-115',
    homeZone: 'kalpvas-camp',
    currentZone: 'kalpvas-camp',
    skills: ['Medical Aid', 'Child Support'],
    languages: ['Hindi', 'Bhojpuri'],
    fatigue: 36,
    shiftsToday: 1,
    status: 'training',
    preference: 'field',
  },
  {
    id: 'v-116',
    name: 'Sameer Ali',
    badge: 'MKB-116',
    homeZone: 'rail-arrival',
    currentZone: 'bus-corridor',
    skills: ['Security Liaison', 'Crowd Guidance'],
    languages: ['Hindi', 'Urdu', 'English'],
    fatigue: 31,
    shiftsToday: 1,
    status: 'available',
    preference: 'field',
  },
  {
    id: 'v-117',
    name: 'Aditi Sharma',
    badge: 'MKB-117',
    homeZone: 'sangam-ghat',
    currentZone: 'akshayavat',
    skills: ['Crowd Guidance', 'Water Relief'],
    languages: ['Hindi', 'English'],
    fatigue: 24,
    shiftsToday: 1,
    status: 'available',
    preference: 'field',
  },
  {
    id: 'v-118',
    name: 'Rahul Nair',
    badge: 'MKB-118',
    homeZone: 'rail-arrival',
    currentZone: 'rail-arrival',
    skills: ['Logistics', 'Medical Aid'],
    languages: ['Hindi', 'Malayalam', 'English'],
    fatigue: 33,
    shiftsToday: 1,
    status: 'available',
    preference: 'mobile',
  },
  {
    id: 'v-119',
    name: 'Zoya Ansari',
    badge: 'MKB-119',
    homeZone: 'lost-helpdesk',
    currentZone: 'lost-helpdesk',
    skills: ['Child Support', 'Security Liaison'],
    languages: ['Hindi', 'Urdu', 'English'],
    fatigue: 28,
    shiftsToday: 1,
    status: 'available',
    preference: 'desk',
  },
  {
    id: 'v-120',
    name: 'Manoj Yadav',
    badge: 'MKB-120',
    homeZone: 'bus-corridor',
    currentZone: 'bus-corridor',
    skills: ['Logistics', 'Water Relief'],
    languages: ['Hindi', 'Bhojpuri'],
    fatigue: 44,
    shiftsToday: 2,
    status: 'available',
    preference: 'mobile',
  },
  {
    id: 'v-121',
    name: 'Leena George',
    badge: 'MKB-121',
    homeZone: 'kalpvas-camp',
    currentZone: 'kalpvas-camp',
    skills: ['Medical Aid', 'Language Support'],
    languages: ['Hindi', 'English', 'Malayalam'],
    fatigue: 20,
    shiftsToday: 0,
    status: 'available',
    preference: 'field',
  },
  {
    id: 'v-122',
    name: 'Chirag Jain',
    badge: 'MKB-122',
    homeZone: 'akshayavat',
    currentZone: 'akshayavat',
    skills: ['Crowd Guidance', 'Logistics'],
    languages: ['Hindi', 'English', 'Marathi'],
    fatigue: 37,
    shiftsToday: 1,
    status: 'available',
    preference: 'field',
  },
  {
    id: 'v-123',
    name: 'Ritika Sen',
    badge: 'MKB-123',
    homeZone: 'rail-arrival',
    currentZone: 'lost-helpdesk',
    skills: ['Language Support', 'Child Support'],
    languages: ['Hindi', 'Bengali', 'English'],
    fatigue: 30,
    shiftsToday: 1,
    status: 'available',
    preference: 'desk',
  },
  {
    id: 'v-124',
    name: 'Karan Mehta',
    badge: 'MKB-124',
    homeZone: 'sangam-ghat',
    currentZone: 'sangam-ghat',
    skills: ['Security Liaison', 'Crowd Guidance'],
    languages: ['Hindi', 'Gujarati'],
    fatigue: 49,
    shiftsToday: 2,
    status: 'available',
    preference: 'field',
  },
]

export const incidents: Incident[] = [
  {
    id: 'inc-201',
    zoneId: 'sangam-ghat',
    type: 'Crowd pressure rising',
    severity: 5,
    requiredSkill: 'Crowd Guidance',
    ageMinutes: 9,
    status: 'triaged',
  },
  {
    id: 'inc-202',
    zoneId: 'lost-helpdesk',
    type: 'Separated child report',
    severity: 4,
    requiredSkill: 'Child Support',
    ageMinutes: 14,
    status: 'queued',
  },
  {
    id: 'inc-203',
    zoneId: 'rail-arrival',
    type: 'Language support queue',
    severity: 3,
    requiredSkill: 'Language Support',
    ageMinutes: 21,
    status: 'queued',
  },
  {
    id: 'inc-204',
    zoneId: 'kalpvas-camp',
    type: 'Heat exhaustion cluster',
    severity: 3,
    requiredSkill: 'Medical Aid',
    ageMinutes: 17,
    status: 'assigned',
  },
]
