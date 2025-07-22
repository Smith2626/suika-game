<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let roomCode = '----';
    export let players = [];
    export let localPlayerName = ''; // We now receive the local player's name

    // This is the new, reliable way to determine if the current user is the host.
    // It's a "reactive statement" - it will automatically recalculate whenever 'players' changes.
    $: isHost = players.find(p => p.name === localPlayerName)?.isHost || false;

    function copyCode() {
        navigator.clipboard.writeText(roomCode);
        alert(`Room code "${roomCode}" copied to clipboard!`);
    }
</script>

<div class="screen-overlay">
    <div class="lobby-box">
        <h2 class="title">Game Lobby</h2>
        <p class="description">Share this code with your friends to invite them:</p>
        <button class="room-code-display" on:click={copyCode} title="Click to copy">{roomCode}</button>
        
        <h3 class="players-title">Players in Room ({players.length})</h3>
        <ul class="player-list">
            {#each players as player (player.name)}
                <li>
                    <span>{player.name}</span>
                    {#if player.isHost}<span class="host-tag">Host</span>{/if}
                </li>
            {/each}
        </ul>

        <div class="button-group">
            {#if isHost}
                <button class="lobby-button start" on:click={() => dispatch('startgame')} disabled={players.length < 2}>Start Game</button>
            {:else}
                <p class="waiting-text">Waiting for host to start...</p>
            {/if}
            <button class="lobby-button leave" on:click={() => dispatch('leave')}>Leave Room</button>
        </div>
    </div>
</div>

<style>
    .screen-overlay { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.75); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .lobby-box { background-color: #a0522d; padding: 2rem; border-radius: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: white; width: 500px; max-width: 90%; border: 4px solid #8B4513; text-align: center; }
    .title { font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #fde047; }
    .description { color: #f0e68c; margin-bottom: 1rem; }
    .room-code-display { font-size: 3rem; font-family: 'Courier New', monospace; letter-spacing: 0.5rem; background: rgba(0,0,0,0.3); color: #fde047; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0 2rem 0; cursor: pointer; border: 2px dashed #8B4513; width: 100%; }
    .players-title { font-size: 1.2rem; font-weight: 600; text-align: left; }
    .player-list { list-style: none; padding: 0; min-height: 120px; background: rgba(0,0,0,0.2); border-radius: 0.5rem; padding: 1rem; text-align: left; }
    .player-list li { font-size: 1.1rem; padding: 0.5rem; display: flex; justify-content: space-between; }
    .player-list li:not(:last-child) { border-bottom: 1px solid rgba(255,255,255,0.1); }
    .host-tag { background: #fde047; color: #8B4513; font-size: 0.8rem; font-weight: bold; padding: 0.1rem 0.5rem; border-radius: 1rem; }
    .button-group { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 2rem; }
    .lobby-button { border: none; padding: 1rem; font-size: 1.2rem; font-weight: bold; border-radius: 0.75rem; cursor: pointer; }
    .lobby-button.start { background-color: #22c55e; color: white; }
    .lobby-button.start:disabled { background-color: #555; cursor: not-allowed; }
    .lobby-button.leave { background-color: #6b7280; color: white; }
    .waiting-text { font-style: italic; color: #ccc; }
</style>