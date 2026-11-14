// Every ID the database accepts. Keep in sync with the allowlists in firestore.rules
// (a unit test checks they match).

export type Role = 'satyam' | 'ut'
export type GameId = 'matcha' | 'language' | 'pawprints' | 'presentation'
export type ZoneId = 'cafe' | 'academy' | 'courtyard' | 'auditorium' | 'rooftop'

export const GAME_IDS: GameId[] = ['matcha', 'language', 'pawprints', 'presentation']
export const MAX_SCORE: Record<GameId, number> = { matcha: 100, language: 96, pawprints: 60, presentation: 100 }
export const GAME_TITLE: Record<GameId, string> = {
  matcha: 'Matcha Mission',
  language: 'Phrase Flashcards',
  pawprints: 'Find the Missing Pawprints',
  presentation: 'Presentation Rescue',
}

export interface ZoneDef {
  id: ZoneId
  name: string
  short: string
  glyph: string
}

export const ZONES: ZoneDef[] = [
  { id: 'cafe', name: 'Cà Phê Cóc & The Outstanding Coffee Debt', short: 'Café', glyph: '☕' },
  { id: 'academy', name: 'The Very Unofficial Language Academy', short: 'Academy', glyph: '📚' },
  { id: 'courtyard', name: 'Simba & the Sleepy Cat Investigation Bureau', short: 'Pet Courtyard', glyph: '🐾' },
  { id: 'auditorium', name: 'Professor Út’s Confidence Test', short: 'Auditorium', glyph: '🎤' },
  { id: 'rooftop', name: 'The Moonlit Postcard Studio', short: 'Rooftop', glyph: '🌙' },
]

export type PieceId = 'piece_cafe' | 'piece_academy' | 'piece_courtyard' | 'piece_auditorium' | 'piece_rooftop'
export const PIECE_IDS: PieceId[] = ['piece_cafe', 'piece_academy', 'piece_courtyard', 'piece_auditorium', 'piece_rooftop']

export type EggId =
  | 'bell_receipt'
  | 'sleepy_cat'
  | 'simba_spins'
  | 'oi_dictionary'
  | 'aodai_inspection'
  | 'projector_cat'
  | 'origami_lantern'
  | 'koi_follow'
  | 'cloud_mountain'
  | 'coffee_fees'
  | 'snow_postcard'
  | 'oi_echo'

export const EGGS: { id: EggId; title: string; hint: string }[] = [
  { id: 'bell_receipt', title: 'The Receipt', hint: 'Some bells need asking three times.' },
  { id: 'sleepy_cat', title: 'One Eye Open', hint: 'Disturb a very busy cat.' },
  { id: 'simba_spins', title: 'Triple Spin', hint: 'Pet the enthusiastic one.' },
  { id: 'oi_dictionary', title: '“Ơi” Has Entered the Chat', hint: 'Open the academy dictionary.' },
  { id: 'aodai_inspection', title: 'Wardrobe Inspection', hint: 'Try on something elegant.' },
  { id: 'projector_cat', title: 'The Real Presentation', hint: 'Check the projector beam.' },
  { id: 'origami_lantern', title: 'Paper Lantern', hint: 'Look closely at the museum textile.' },
  { id: 'koi_follow', title: 'A Curious Fish', hint: 'Visit the koi pond.' },
  { id: 'cloud_mountain', title: 'Worth the Climb', hint: 'A cloud on the rooftop is hiding something.' },
  { id: 'coffee_fees', title: 'Running at a Loss', hint: 'Read the café chalkboard.' },
  { id: 'snow_postcard', title: 'Quiet Snow', hint: 'Choose a wintry postcard.' },
  { id: 'oi_echo', title: 'Paper Airplane', hint: 'Send a little “ơi” across the city.' },
]
export const EGG_IDS = EGGS.map((e) => e.id)

export type BadgeId =
  | 'professor_of_oi'
  | 'tutor_under_investigation'
  | 'coffee_funded_diploma'
  | 'chief_coffee_inspector'
  | 'cat_union_rep'
  | 'certified_cat_inspector'
  | 'survived_the_cat'
  | 'postcard_collector'
  | 'wardrobe_inspection'
  | 'paper_airplane_pilot'

export const BADGES: { id: BadgeId; title: string; how: string; stamp: string }[] = [
  { id: 'professor_of_oi', title: 'Certified Professor of “Ơi”', how: 'Flip a round of Vietnamese → English flashcards', stamp: 'ƠI' },
  { id: 'tutor_under_investigation', title: 'English Tutor (Under Investigation)', how: 'Flip a round of English → Vietnamese flashcards', stamp: 'ENG' },
  { id: 'coffee_funded_diploma', title: 'Coffee-Funded Diploma', how: 'Match most of a flashcard round', stamp: '☕☕' },
  { id: 'chief_coffee_inspector', title: 'Chief Coffee Inspector’s Approval', how: 'Score 80+ in Matcha Mission', stamp: '☕' },
  { id: 'cat_union_rep', title: 'Cat Union Representative', how: 'Close a pawprint investigation', stamp: '🐾' },
  { id: 'certified_cat_inspector', title: 'Certified Cat Inspector', how: 'Get a reaction from Sleepy Cat', stamp: 'CAT' },
  { id: 'survived_the_cat', title: 'Survived the Cat', how: 'Rescue a presentation', stamp: '🎤' },
  { id: 'postcard_collector', title: 'Postcard Collector', how: 'Find all five postcard pieces', stamp: '5/5' },
  { id: 'wardrobe_inspection', title: 'Wardrobe Inspection: Passed', how: 'Wear the áo dài', stamp: 'ÁO' },
  { id: 'paper_airplane_pilot', title: 'Paper Airplane Pilot', how: 'Send an “ơi” echo', stamp: '✈' },
]
export const BADGE_IDS = BADGES.map((b) => b.id)

export type BackgroundId =
  | 'lanterns'
  | 'rainy_window'
  | 'koi_pond'
  | 'museum_textile'
  | 'flower_courtyard'
  | 'mountain_clouds'
  | 'winter_snow'
  | 'moonlit_rooftop'

export const BACKGROUNDS: { id: BackgroundId; name: string }[] = [
  { id: 'lanterns', name: 'Hanoi lanterns' },
  { id: 'rainy_window', name: 'Rainy window' },
  { id: 'koi_pond', name: 'Koi pond' },
  { id: 'museum_textile', name: 'Old museum textile' },
  { id: 'flower_courtyard', name: 'Flowering courtyard' },
  { id: 'mountain_clouds', name: 'Mountain clouds' },
  { id: 'winter_snow', name: 'Peaceful winter snow' },
  { id: 'moonlit_rooftop', name: 'Moonlit rooftop' },
]

export type StickerId = 'coffee' | 'paw' | 'moon' | 'laugh' | 'sparkle' | 'cat' | 'lantern' | 'plane'
export const STICKERS: { id: StickerId; label: string; glyph: string }[] = [
  { id: 'coffee', label: 'Coffee', glyph: '☕' },
  { id: 'paw', label: 'Paw', glyph: '🐾' },
  { id: 'moon', label: 'Moon', glyph: '🌙' },
  { id: 'laugh', label: 'Laughing', glyph: '😂' },
  { id: 'sparkle', label: 'Sparkle', glyph: '✨' },
  { id: 'cat', label: 'Sleepy cat', glyph: '🐈' },
  { id: 'lantern', label: 'Lantern', glyph: '🏮' },
  { id: 'plane', label: 'Paper airplane', glyph: '✈️' },
]

// 🌸 and 💛 are small, friendly reactions — never a confession.
export const REACTIONS = ['☕', '🐾', '🌙', '😂', '✨', '🌸', '💛'] as const
export type Reaction = (typeof REACTIONS)[number]

export const ARTIFACT_FOR: Record<Role, 'simba_ball' | 'cat_bell'> = { satyam: 'simba_ball', ut: 'cat_bell' }

export const LIMITS = { postcardText: 300, echoText: 120, prompt: 140, option: 140, displayName: 24, stickers: 3 }
