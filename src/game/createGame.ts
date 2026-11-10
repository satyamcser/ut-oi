import Phaser from 'phaser'
import { HanoiOverworld, type OverworldData } from './scenes/HanoiOverworld'
import { PetCourtyardScene } from './scenes/PetCourtyardScene'

/** Creates the Phaser game inside `parent`. Phaser is loaded lazily by React. */
export function createGame(parent: HTMLElement, data: OverworldData): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#2B2230',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || 360, height: parent.clientHeight || 640 },
    physics: { default: 'arcade', arcade: { debug: false } },
    input: { keyboard: true, touch: true },
    banner: false,
    audio: { noAudio: true },
    scene: [],
  })
  game.scene.add('overworld', HanoiOverworld, true, data)
  game.scene.add('pawprints', PetCourtyardScene, false)
  // Dev-only handle for debugging in the browser console; stripped from production builds.
  if (import.meta.env.DEV) (window as unknown as { __utGame?: Phaser.Game }).__utGame = game
  return game
}

export function startPawprints(game: Phaser.Game, data: { role: 'satyam' | 'ut'; reduced: boolean }) {
  game.scene.sleep('overworld')
  game.scene.start('pawprints', data)
}

export function endPawprints(game: Phaser.Game) {
  game.scene.stop('pawprints')
  game.scene.wake('overworld')
}

export type { OverworldData }
