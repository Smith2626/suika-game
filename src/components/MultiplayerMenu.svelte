<script>
    import { gameState } from '../lib/gameStore.js';
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    let roomCode = '';
</script>

<div class="screen-overlay">
    <div class="lobby-box">
        <h2 class="title">Multiplayer</h2>
        <div class="action-section">
            <h3 class="section-title">Create a New Game</h3>
            <p class="description">Start a private room and invite friends with a unique code.</p>
            <button class="lobby-button create" on:click={() => dispatch('create')}>Create Room</button>
        </div>
        <div class="divider">OR</div>
        <div class="action-section">
            <h3 class="section-title">Join a Game</h3>
            <p class="description">Enter a 4-digit code to join a friend's room.</p>
            <form on:submit|preventDefault={() => dispatch('join', { code: roomCode })} class="join-group">
                <input type="text" bind:value={roomCode} placeholder="CODE" maxlength="4" class="code-input">
                <button type="submit" class="lobby-button join">Join</button>
            </form>
        </div>
        <button class="back-button" on:click={() => $gameState = 'menu'}>Back to Main Menu</button>
    </div>
</div>

<style>
    .screen-overlay { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.75); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 50; animation: fade-in 0.3s ease-out; }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    .lobby-box { background-color: #a0522d; padding: 2rem; border-radius: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.2); color: white; width: 480px; max-width: 90%; border: 4px solid #8B4513; }
    .title { font-size: 3rem; font-weight: 700; text-align: center; margin: 0 0 1.5rem 0; color: #fde047; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
    .action-section { background: rgba(0, 0, 0, 0.2); padding: 1.5rem; border-radius: 1rem; margin: 1rem 0; text-align: center; }
    .section-title { font-size: 1.5rem; margin: 0 0 0.5rem 0; font-weight: 600; color: white; }
    .description { color: #f0e68c; margin: 0 0 1.5rem 0; font-size: 0.9rem; }
    .divider { text-align: center; font-weight: bold; color: rgba(255, 255, 255, 0.4); margin: 1.5rem 0; }
    .join-group { display: flex; gap: 0.75rem; }
    .code-input { flex-grow: 1; min-width: 0; text-align: center; font-family: 'Courier New', Courier, monospace; font-size: 2rem; font-weight: bold; letter-spacing: 0.5rem; text-transform: uppercase; background: rgba(0,0,0,0.3); color: white; border: 2px solid #8B4513; border-radius: 0.5rem; padding: 0.75rem; transition: border-color 0.2s, box-shadow 0.2s; }
    .code-input:focus { outline: none; border-color: #fde047; box-shadow: 0 0 15px rgba(253, 224, 71, 0.5); }
    .lobby-button { border: none; padding: 1rem; font-size: 1.2rem; font-weight: bold; border-radius: 0.75rem; cursor: pointer; transition: all 0.2s ease-in-out; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
    .lobby-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.4); filter: brightness(1.1); }
    .lobby-button.create { width: 100%; background: #22c55e; color: white; }
    .lobby-button.join { background: #3b82f6; color: white; padding: 1rem 2rem; flex-shrink: 0; }
    .back-button { background: none; color: #f0e68c; border: none; text-decoration: underline; cursor: pointer; display: block; margin: 2rem auto 0; padding: 0.5rem; }
</style>