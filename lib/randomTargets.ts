// Wild, challenging HTML/CSS design targets for RETRO MODE
const RETRO_TARGETS = [
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

// Holiday rental UI component challenges for TURBO MODE
const TURBO_TARGETS = [
  'A property search bar with location autocomplete, date pickers, and a guest counter. Make it feel like midnight shopping for impossibly cheap villas.',
  'A listing card with image carousel, price per night, star rating, and a heart-shaped wishlist button. In the style of wish-you-were-here postcards.',
  'A filter panel for amenities: pool, wifi, hot tub, pet-friendly. Present it like choosing toppings at a build-your-own-pizza place.',
  'A property details page with a photo gallery, host profile card, and availability calendar. Inspired by dating app profiles but for houses.',
  'A booking confirmation modal with stay summary, total price breakdown, and cancellation policy. Style it like a boarding pass for a flight to paradise.',
  'A review section with star ratings, guest photos, and host responses. Make it feel like reading gossip in a group chat.',
  'A map view with property pins that show price on hover and thumbnail on click. Think treasure hunt meets real estate.',
  'A host dashboard showing upcoming bookings, earnings chart, and property performance metrics. In the style of a video game stats screen.',
  'A checkout flow with payment details, trip insurance options, and house rules agreement. Make it feel less painful than it actually is.',
  'A wishlist page displaying saved properties in a grid with heart animations when items are added. Style it like collecting trading cards.',
  'A property comparison table showing 3 listings side-by-side with amenities, prices, and ratings. Present it like a fighter selection screen.',
  'A guest messaging interface with host chat, booking details sidebar, and quick reply suggestions. Think WhatsApp meets concierge service.',
  'A special offers carousel highlighting weekend deals, last-minute bookings, and seasonal discounts. Make it feel like slot machine jackpots.',
  'A flexible dates calendar showing price variations across different check-in dates. Style it like a heatmap of when beaches are emptiest.',
  'An instant book toggle, house rules checklist, and cleaning fee explainer. Present it with the seriousness of airport security instructions but make it fun.',
  'A neighbourhood guide with local restaurant cards, attraction pins, and insider tips. In the style of a secret travel diary.',
  'A split-test between two property hero images with a "This or That" voting mechanism. Like Tinder but for holiday homes.',
  'A loyalty rewards tracker showing nights stayed, points earned, and badge unlocks. Make it feel like collecting airline miles for couch surfing.',
  'A property availability widget showing booked dates, pricing, and minimum night stays. Style it like a concert ticket availability checker.',
  'A host verification badge system with trust indicators, response time, and superhost status. Present it like achievement unlocks in a game.',
  'A group booking planner where multiple guests can vote on properties and dates. Style it like coordinating a heist in a spy movie.',
  'A seasonal pricing calculator that adjusts rates based on holidays, events, and demand. Make it transparent like showing poker cards face-up.',
  'A smart filter that learns preferences: "More like this" or "Not my vibe" buttons for rapid property browsing. Like music discovery but for vacation homes.',
  'A property inquiry form with custom questions, instant booking option, and host response time estimate. Style it like sending a message in a bottle that gets immediate reply.',
  'A virtual tour embed with 360° room navigation, floorplan overlay, and dimension measurements. Present it like exploring a video game level.',
];

/**
 * Get a random target text for game creation
 * @param renderMode - 'retro' for HTML/CSS challenges, 'turbo' for React component challenges
 * @returns A random target description appropriate for the render mode
 */
export function getRandomTarget(renderMode: 'retro' | 'turbo' = 'retro'): string {
  const targets = renderMode === 'turbo' ? TURBO_TARGETS : RETRO_TARGETS;
  const randomIndex = Math.floor(Math.random() * targets.length);
  return targets[randomIndex];
}
