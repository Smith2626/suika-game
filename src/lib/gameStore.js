import { writable } from 'svelte/store';

// All possible states of the entire application now live here.
export const gameState = writable('menu'); 
// 'menu', 'playing', 'playing_multiplayer', 'gameover', 'multiplayer_menu', 'lobby', 'name_input'