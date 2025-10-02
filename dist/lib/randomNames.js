"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomName = getRandomName;
// Cheeky, witty names in keeping with the chaos theme
const RANDOM_NAMES = [
    'CSS Wizard',
    'Div Dabbler',
    'Pixel Pusher',
    'Code Gremlin',
    'Layout Lunatic',
    'Flexbox Fighter',
    'Grid Goblin',
    'Margin Maniac',
    'Padding Pirate',
    'Border Bandit',
    'Shadow Sorcerer',
    'Gradient Guru',
    'Animation Anarchist',
    'Transform Trickster',
    'Opacity Overlord',
    'Z-Index Zealot',
    'Position Punk',
    'Display Daredevil',
    'Float Fiend',
    'Clear Chaos',
    'Overflow Oracle',
    'Cursor Clown',
    'Pointer Prankster',
    'Hover Hooligan',
    'Focus Fanatic',
    'Active Agent',
    'Visited Vandal',
    'Link Lunatic',
    'Pseudo Psycho',
    'Before Beast',
    'After Anarchist',
    'Content Connoisseur',
    'Selector Savage',
    'Class Clown',
    'ID Idiot',
    'Tag Troublemaker',
    'Universal Unicorn',
    'Child Chaos',
    'Adjacent Assassin',
    'Sibling Sorcerer',
    'Descendant Demon',
    'First Fighter',
    'Last Lunatic',
    'Only Oracle',
    'Nth Ninja',
    'Empty Emperor',
    'Root Rascal',
    'HTML Hacker',
    'CSS Catastrophe',
    'Style Stealer',
    'Vibe Validator',
];
/**
 * Get a random name that isn't already taken
 * @param existingNames - Array of names already in use
 * @returns A unique random name
 */
function getRandomName(existingNames) {
    // Filter out names that are already taken (case-insensitive)
    const existingLower = existingNames.map(n => n.toLowerCase());
    const availableNames = RANDOM_NAMES.filter(name => !existingLower.includes(name.toLowerCase()));
    // If all names are taken, fall back to numbered names
    if (availableNames.length === 0) {
        let counter = 1;
        while (existingLower.includes(`chaos agent ${counter}`.toLowerCase())) {
            counter++;
        }
        return `Chaos Agent ${counter}`;
    }
    // Return a random available name
    const randomIndex = Math.floor(Math.random() * availableNames.length);
    return availableNames[randomIndex];
}
