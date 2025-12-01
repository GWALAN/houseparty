/**
 * Emoji Mapping System for Microsoft Fluent 3D Emojis
 *
 * Maps Unicode emoji characters to their corresponding 3D PNG assets.
 * Assets are sourced from Microsoft Fluent Emoji (MIT License)
 * GitHub: https://github.com/microsoft/fluentui-emoji
 *
 * Note: PNG files should be placed in assets/emojis/3d/ directory
 */

export type EmojiMapping = Record<string, any>;

/**
 * Main emoji mapping from Unicode character to 3D PNG asset
 * Using require() for optimal bundling and caching in React Native
 */
export const emojiImages: EmojiMapping = {
  // Houses & Buildings
  '🏠': require('../assets/emojis/3d/house.png'),
  '🏡': require('../assets/emojis/3d/house-with-garden.png'),
  '🏢': require('../assets/emojis/3d/office-building.png'),
  '🏣': require('../assets/emojis/3d/japanese-post-office.png'),
  '🏤': require('../assets/emojis/3d/post-office.png'),
  '🏥': require('../assets/emojis/3d/hospital.png'),
  '🏰': require('../assets/emojis/3d/castle.png'),
  '🗼': require('../assets/emojis/3d/tokyo-tower.png'),
  '🏖️': require('../assets/emojis/3d/beach.png'),
  '🏝️': require('../assets/emojis/3d/island.png'),

  // Sports
  '⚽': require('../assets/emojis/3d/soccer.png'),
  '🏀': require('../assets/emojis/3d/basketball.png'),
  '🏈': require('../assets/emojis/3d/football.png'),
  '⚾': require('../assets/emojis/3d/baseball.png'),
  '🎾': require('../assets/emojis/3d/tennis.png'),
  '🏐': require('../assets/emojis/3d/volleyball.png'),
  '🏓': require('../assets/emojis/3d/ping-pong.png'),
  '🏸': require('../assets/emojis/3d/badminton.png'),
  '🎿': require('../assets/emojis/3d/ski.png'),
  '⛷️': require('../assets/emojis/3d/skier.png'),
  '🏂': require('../assets/emojis/3d/snowboard.png'),
  '🏹': require('../assets/emojis/3d/bow-arrow.png'),

  // Gaming & Entertainment
  '🎮': require('../assets/emojis/3d/game-controller.png'),
  '🕹️': require('../assets/emojis/3d/joystick.png'),
  '🎯': require('../assets/emojis/3d/target.png'),
  '🎲': require('../assets/emojis/3d/dice.png'),
  '🎳': require('../assets/emojis/3d/bowling.png'),
  '🎪': require('../assets/emojis/3d/circus.png'),
  '🃏': require('../assets/emojis/3d/joker.png'),
  '🎰': require('../assets/emojis/3d/slot-machine.png'),
  '👾': require('../assets/emojis/3d/alien-monster.png'),

  // Animals
  '🦁': require('../assets/emojis/3d/lion.png'),
  '🐯': require('../assets/emojis/3d/tiger-face.png'),
  '🐻': require('../assets/emojis/3d/bear.png'),
  '🦊': require('../assets/emojis/3d/fox.png'),
  '🐺': require('../assets/emojis/3d/wolf.png'),
  '🦅': require('../assets/emojis/3d/eagle.png'),
  '🦈': require('../assets/emojis/3d/shark.png'),
  '🐉': require('../assets/emojis/3d/dragon.png'),
  '🦜': require('../assets/emojis/3d/parrot.png'),
  '🦄': require('../assets/emojis/3d/unicorn.png'),
  '🐠': require('../assets/emojis/3d/tropical-fish.png'),
  '🐟': require('../assets/emojis/3d/fish.png'),
  '🐙': require('../assets/emojis/3d/octopus.png'),
  '🦑': require('../assets/emojis/3d/squid.png'),
  '🐚': require('../assets/emojis/3d/shell.png'),
  '🦀': require('../assets/emojis/3d/crab.png'),
  '🦞': require('../assets/emojis/3d/lobster.png'),
  '🐬': require('../assets/emojis/3d/dolphin.png'),

  // Energy & Effects
  '🔥': require('../assets/emojis/3d/fire.png'),
  '💥': require('../assets/emojis/3d/collision.png'),
  '⚡': require('../assets/emojis/3d/lightning.png'),
  '💫': require('../assets/emojis/3d/dizzy.png'),
  '✨': require('../assets/emojis/3d/sparkles.png'),
  '⭐': require('../assets/emojis/3d/star.png'),
  '🌟': require('../assets/emojis/3d/glowing-star.png'),
  '💢': require('../assets/emojis/3d/anger.png'),
  '🔆': require('../assets/emojis/3d/bright-sun.png'),
  '☄️': require('../assets/emojis/3d/comet.png'),

  // Space & Cosmic
  '🌌': require('../assets/emojis/3d/milky-way.png'),
  '🪐': require('../assets/emojis/3d/saturn.png'),
  '🌙': require('../assets/emojis/3d/moon.png'),
  '🚀': require('../assets/emojis/3d/rocket.png'),
  '🛸': require('../assets/emojis/3d/ufo.png'),
  '👽': require('../assets/emojis/3d/alien.png'),

  // Creatures & Characters
  '👻': require('../assets/emojis/3d/ghost.png'),
  '👹': require('../assets/emojis/3d/ogre.png'),
  '👺': require('../assets/emojis/3d/goblin.png'),
  '💀': require('../assets/emojis/3d/skull.png'),
  '☠️': require('../assets/emojis/3d/skull-crossbones.png'),
  '🤖': require('../assets/emojis/3d/robot.png'),
  '🎃': require('../assets/emojis/3d/pumpkin.png'),
  '😈': require('../assets/emojis/3d/devil.png'),
  '🥷': require('../assets/emojis/3d/ninja.png'),
  '🧙': require('../assets/emojis/3d/wizard.png'),
  '🧚': require('../assets/emojis/3d/fairy.png'),

  // Food & Drinks
  '🍕': require('../assets/emojis/3d/pizza.png'),
  '🍔': require('../assets/emojis/3d/burger.png'),
  '🍟': require('../assets/emojis/3d/fries.png'),
  '🌭': require('../assets/emojis/3d/hotdog.png'),
  '🍿': require('../assets/emojis/3d/popcorn.png'),
  '🧃': require('../assets/emojis/3d/juice.png'),
  '🍩': require('../assets/emojis/3d/donut.png'),
  '🍰': require('../assets/emojis/3d/cake.png'),
  '🎂': require('../assets/emojis/3d/birthday-cake.png'),
  '🍪': require('../assets/emojis/3d/cookie.png'),
  '🍾': require('../assets/emojis/3d/champagne.png'),

  // Fruits
  '🍎': require('../assets/emojis/3d/apple.png'),
  '🍊': require('../assets/emojis/3d/orange.png'),
  '🍋': require('../assets/emojis/3d/lemon.png'),
  '🍌': require('../assets/emojis/3d/banana.png'),
  '🍉': require('../assets/emojis/3d/watermelon.png'),
  '🍇': require('../assets/emojis/3d/grapes.png'),
  '🍓': require('../assets/emojis/3d/strawberry.png'),
  '🥝': require('../assets/emojis/3d/kiwi.png'),
  '🍑': require('../assets/emojis/3d/peach.png'),
  '🥑': require('../assets/emojis/3d/avocado.png'),

  // Hearts
  '❤️': require('../assets/emojis/3d/red-heart.png'),
  '💕': require('../assets/emojis/3d/two-hearts.png'),
  '💖': require('../assets/emojis/3d/sparkling-heart.png'),
  '💗': require('../assets/emojis/3d/growing-heart.png'),
  '💓': require('../assets/emojis/3d/beating-heart.png'),
  '💝': require('../assets/emojis/3d/heart-gift.png'),
  '💘': require('../assets/emojis/3d/heart-arrow.png'),
  '💞': require('../assets/emojis/3d/revolving-hearts.png'),
  '💟': require('../assets/emojis/3d/heart-decoration.png'),
  '♥️': require('../assets/emojis/3d/heart-suit.png'),
  '💔': require('../assets/emojis/3d/broken-heart.png'),

  // Music
  '🎵': require('../assets/emojis/3d/music-note.png'),
  '🎶': require('../assets/emojis/3d/music-notes.png'),
  '🎸': require('../assets/emojis/3d/guitar.png'),
  '🎹': require('../assets/emojis/3d/keyboard.png'),
  '🎺': require('../assets/emojis/3d/trumpet.png'),
  '🎷': require('../assets/emojis/3d/saxophone.png'),
  '🥁': require('../assets/emojis/3d/drum.png'),
  '🎤': require('../assets/emojis/3d/microphone.png'),
  '🎧': require('../assets/emojis/3d/headphones.png'),
  '🎼': require('../assets/emojis/3d/music-score.png'),

  // Mystic & Magic
  '🔮': require('../assets/emojis/3d/crystal-ball.png'),
  '🪄': require('../assets/emojis/3d/magic-wand.png'),
  '👑': require('../assets/emojis/3d/crown.png'),
  '💎': require('../assets/emojis/3d/gem.png'),
  '🗡️': require('../assets/emojis/3d/sword.png'),

  // Nature
  '🌲': require('../assets/emojis/3d/evergreen.png'),
  '🌳': require('../assets/emojis/3d/tree.png'),
  '🌴': require('../assets/emojis/3d/palm-tree.png'),
  '🌵': require('../assets/emojis/3d/cactus.png'),
  '🌾': require('../assets/emojis/3d/wheat.png'),
  '🍀': require('../assets/emojis/3d/clover.png'),
  '🌺': require('../assets/emojis/3d/hibiscus.png'),
  '🌻': require('../assets/emojis/3d/sunflower.png'),
  '🌷': require('../assets/emojis/3d/tulip.png'),
  '🌹': require('../assets/emojis/3d/rose.png'),
  '💐': require('../assets/emojis/3d/bouquet.png'),
  '🌸': require('../assets/emojis/3d/cherry-blossom.png'),

  // Ocean & Water
  '🌊': require('../assets/emojis/3d/wave.png'),

  // Party & Celebration
  '🎉': require('../assets/emojis/3d/party-popper.png'),
  '🎊': require('../assets/emojis/3d/confetti-ball.png'),
  '🎈': require('../assets/emojis/3d/balloon.png'),
  '🎁': require('../assets/emojis/3d/gift.png'),
  '🎀': require('../assets/emojis/3d/ribbon.png'),
  '🎆': require('../assets/emojis/3d/fireworks.png'),
  '🎇': require('../assets/emojis/3d/sparkler.png'),
  '🥳': require('../assets/emojis/3d/party-face.png'),

  // Pirate
  '🏴‍☠️': require('../assets/emojis/3d/pirate-flag.png'),
  '⚓': require('../assets/emojis/3d/anchor.png'),
  '💰': require('../assets/emojis/3d/money-bag.png'),
  '🗺️': require('../assets/emojis/3d/map.png'),
  '🧭': require('../assets/emojis/3d/compass.png'),
  '⛵': require('../assets/emojis/3d/sailboat.png'),
  '🚢': require('../assets/emojis/3d/ship.png'),

  // Rainbow & Art
  '🌈': require('../assets/emojis/3d/rainbow.png'),
  '🎨': require('../assets/emojis/3d/palette.png'),
  '🖌️': require('../assets/emojis/3d/paintbrush.png'),
  '🖍️': require('../assets/emojis/3d/crayon.png'),
  '✏️': require('../assets/emojis/3d/pencil.png'),
  '🖊️': require('../assets/emojis/3d/pen.png'),
  '🖋️': require('../assets/emojis/3d/fountain-pen.png'),
  '📝': require('../assets/emojis/3d/memo.png'),

  // Retro
  '📼': require('../assets/emojis/3d/videotape.png'),
  '📻': require('../assets/emojis/3d/radio.png'),
  '☎️': require('../assets/emojis/3d/phone.png'),
  '📟': require('../assets/emojis/3d/pager.png'),
  '💾': require('../assets/emojis/3d/floppy.png'),
  '📠': require('../assets/emojis/3d/fax.png'),
  '📺': require('../assets/emojis/3d/tv.png'),
  '🎙️': require('../assets/emojis/3d/microphone-studio.png'),
  '📹': require('../assets/emojis/3d/video-camera.png'),
  '📷': require('../assets/emojis/3d/camera.png'),

  // Tech
  '💻': require('../assets/emojis/3d/laptop.png'),
  '📱': require('../assets/emojis/3d/smartphone.png'),
  '⌨️': require('../assets/emojis/3d/keyboard-tech.png'),
  '🖱️': require('../assets/emojis/3d/mouse.png'),
  '🖥️': require('../assets/emojis/3d/desktop.png'),
  '📡': require('../assets/emojis/3d/satellite.png'),
  '🔌': require('../assets/emojis/3d/plug.png'),

  // Travel
  '✈️': require('../assets/emojis/3d/airplane.png'),
  '🚗': require('../assets/emojis/3d/car.png'),
  '🚂': require('../assets/emojis/3d/train.png'),
  '🧳': require('../assets/emojis/3d/luggage.png'),
  '⛰️': require('../assets/emojis/3d/mountain.png'),

  // Warrior
  '🥋': require('../assets/emojis/3d/martial-arts.png'),
  '⚔️': require('../assets/emojis/3d/crossed-swords.png'),
  '🛡️': require('../assets/emojis/3d/shield.png'),
  '💣': require('../assets/emojis/3d/bomb.png'),
  '🧨': require('../assets/emojis/3d/firecracker.png'),

  // Weather
  '☀️': require('../assets/emojis/3d/sun.png'),
  '🌤️': require('../assets/emojis/3d/sun-cloud.png'),
  '⛅': require('../assets/emojis/3d/cloud-sun.png'),
  '🌥️': require('../assets/emojis/3d/cloud-sun-big.png'),
  '☁️': require('../assets/emojis/3d/cloud.png'),
  '🌧️': require('../assets/emojis/3d/rain-cloud.png'),
  '⛈️': require('../assets/emojis/3d/thunder-cloud.png'),
  '🌩️': require('../assets/emojis/3d/lightning-cloud.png'),
  '❄️': require('../assets/emojis/3d/snowflake.png'),
  '🌨️': require('../assets/emojis/3d/snow-cloud.png'),

  // Winter
  '⛄': require('../assets/emojis/3d/snowman.png'),
  '☃️': require('../assets/emojis/3d/snowman-with-snow.png'),
  '🧊': require('../assets/emojis/3d/ice-cube.png'),
  '🧣': require('../assets/emojis/3d/scarf.png'),
  '🧤': require('../assets/emojis/3d/gloves.png'),

  // Tools
  '🔨': require('../assets/emojis/3d/hammer.png'),
  '🔧': require('../assets/emojis/3d/wrench.png'),
  '⚙️': require('../assets/emojis/3d/gear.png'),
  '🛠️': require('../assets/emojis/3d/tools.png'),
  '⚒️': require('../assets/emojis/3d/hammer-pick.png'),
  '🔩': require('../assets/emojis/3d/nut-bolt.png'),
  '⛏️': require('../assets/emojis/3d/pick.png'),
  '🪛': require('../assets/emojis/3d/screwdriver.png'),
  '🔪': require('../assets/emojis/3d/knife.png'),
  '✂️': require('../assets/emojis/3d/scissors.png'),

  // Trophies & Awards
  '🏆': require('../assets/emojis/3d/trophy.png'),
  '🥇': require('../assets/emojis/3d/gold-medal.png'),
  '🥈': require('../assets/emojis/3d/silver-medal.png'),
  '🥉': require('../assets/emojis/3d/bronze-medal.png'),
};

/**
 * Helper function to check if an emoji has a 3D asset available
 */
export function hasEmojiAsset(emoji: string): boolean {
  return emoji in emojiImages;
}

/**
 * Get all available emoji characters
 */
export function getAllMappedEmojis(): string[] {
  return Object.keys(emojiImages);
}

/**
 * Get emoji asset for a given character (returns undefined if not found)
 */
export function getEmojiAsset(emoji: string): any | undefined {
  return emojiImages[emoji];
}
