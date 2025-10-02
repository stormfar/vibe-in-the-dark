"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomTarget = getRandomTarget;
// Wild, challenging, and interesting design targets for HTML/CSS challenges
const RANDOM_TARGETS = [
    'A glitchy VHS-style hero section with distorted scanlines and chromatic aberration',
    'A 3D rotating cube made entirely from CSS transforms with different content on each face',
    'An animated Matrix-style falling characters effect as a background',
    'A neon cyberpunk cityscape silhouette with pulsing glow effects',
    'A realistic vinyl record player with spinning disc and moving tonearm',
    'A CSS-art portrait of a robot with geometric shapes and gradients',
    'A trippy kaleidoscope pattern using CSS gradients and animations',
    'An isometric pixel art city scene with buildings at different heights',
    'A wireframe 3D tunnel animation using perspective and transforms',
    'A retro-futuristic dashboard with fake holographic UI elements',
    'A parallax scrolling landscape with multiple layers of depth',
    'An animated liquid blob morphing between shapes using border-radius',
    'A vaporwave aesthetic scene with palm trees, sunset, and grid floor',
    'A broken TV screen effect with RGB channel separation and static noise',
    'A synthwave sunset with horizontal lines and a reflective grid below',
    'An impossible Escher-style staircase using clever perspective tricks',
    'A cassette tape that animates its reels spinning when hovered',
    'A cosmic starfield with twinkling stars and a rotating galaxy spiral',
    'A neon arcade cabinet with glowing buttons and a CRT screen effect',
    'A CSS-only flipbook animation showing a stick figure running',
    'A portal effect with swirling particles spiraling into the center',
    'A retro computer terminal with scrolling green text on black',
    'An animated DNA double helix rotating in 3D space',
    'A crystal prism splitting light into a rainbow spectrum',
    'A psychedelic tie-dye pattern with swirling colors and animations',
    'A floating island scene with waterfalls cascading off the edges',
    'An 8-bit pixel art explosion animation using box-shadows',
    'A holographic foil card effect with rainbow reflections on hover',
    'A geometric low-poly mountain landscape with triangular facets',
    'A wireframe sphere that rotates and pulses with inner lighting',
];
/**
 * Get a random target text for game creation
 * @returns A random target description
 */
function getRandomTarget() {
    const randomIndex = Math.floor(Math.random() * RANDOM_TARGETS.length);
    return RANDOM_TARGETS[randomIndex];
}
