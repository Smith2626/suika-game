<script>
    import { gameState } from '../lib/gameStore.js';
    import { AudioManager } from '../lib/AudioManager.js';
    import { Howler } from 'howler';

    function handleStartGame() {
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
            Howler.ctx.resume();
        }
        AudioManager.play('click');
        $gameState = 'playing';
    }

    function handleMultiplayer() {
        AudioManager.play('click');
        $gameState = 'multiplayer_menu';
    }
</script>

<div class="screen-overlay">
    <div class="menu-box">
        <h2 class="title">Suika Game</h2>
        <p class="description">Combine small fruits to make bigger ones! Don't let them overflow the container.</p>
        <div class="button-group">
            <button on:click={handleStartGame} class="start-button">
                Play Game
            </button>
            <button on:click={handleMultiplayer} class="start-button multiplayer">
                Multiplayer
            </button>
        </div>
    </div>
</div>

<style>
    .screen-overlay { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 50; }
    .menu-box { background: linear-gradient(135deg, #60a5fa, #3b82f6); padding: 2rem 3rem; border-radius: 1.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: center; color: white; max-width: 90%; width: 450px; border: 4px solid white; }
    .title { font-size: 3rem; font-weight: 700; margin: 0; }
    .description { font-size: 1.1rem; margin: 1rem 0 2rem 0; }
    .button-group { display: flex; flex-direction: column; gap: 1rem; }
    .start-button { background-color: #22c55e; color: white; font-size: 1.5rem; font-weight: 700; border: none; border-radius: 0.75rem; padding: 0.75rem 2.5rem; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.2); }
    .start-button:hover { transform: scale(1.05); }
    .start-button.multiplayer { background-color: #5856d6; }
</style>