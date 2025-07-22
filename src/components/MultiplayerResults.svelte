<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import { AudioManager } from '../lib/AudioManager.js';

    const dispatch = createEventDispatcher();

    export let localPlayerName = '';
    export let finalRankings = [];

    const winner = finalRankings.find(p => p.rank === 1);
    const localPlayerIsWinner = winner && winner.name === localPlayerName;
    const localPlayerResult = finalRankings.find(p => p.name === localPlayerName);

    let showConfetti = false;

    onMount(() => {
        if (localPlayerIsWinner) {
            showConfetti = true;
            AudioManager.play('victory');
        }
    });

    function handlePlayAgain() {
        AudioManager.play('click');
        // We now dispatch the event correctly
        dispatch('playagain');
    }
</script>

<div class="screen-overlay">
    {#if showConfetti}
        {#each Array(50) as _}
            <div class="confetti" style="--color: {['#fde047', '#f97316', '#22c55e', '#3b82f6'][Math.floor(Math.random()*4)]}; left: {Math.random()*100}vw; animation-delay: {Math.random()*2}s;"></div>
        {/each}
    {/if}

    <!-- NEW THEME: This now uses the same classes as the Leaderboard -->
    <div class="results-box">
        <h2 class="title">
            {#if localPlayerIsWinner}
                <span class="medal">🏆</span> YOU WIN! <span class="medal">🏆</span>
            {:else}
                Match Over!
            {/if}
        </h2>
        
        <div class="list-container">
            <ul class="score-list">
                {#each finalRankings as player}
                    <li class="score-row" class:local-player={player.name === localPlayerName}>
                        <span class="rank">
                            {#if player.rank === 1}🥇
                            {:else if player.rank === 2}🥈
                            {:else if player.rank === 3}🥉
                            {:else}#{player.rank}
                            {/if}
                        </span>
                        <span class="name">{player.name}</span>
                        <span class="score">{player.score.toLocaleString()}</span>
                    </li>
                {/each}
            </ul>
        </div>
        
        <div class="button-container">
    <button on:click={handlePlayAgain} class="back-to-lobby-button">
        Back to Lobby
    </button>
</div>
    </div>
</div>

<style>
    /* --- Styles for Confetti --- */
    @keyframes confetti-fall { 0% { transform: translateY(-10vh) rotateZ(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotateZ(360deg); opacity: 0; } }
    .confetti { position: fixed; top: 0; width: 10px; height: 10px; background-color: var(--color); animation: confetti-fall 3s linear forwards; z-index: 101; }

    /* --- NEW STYLES: Copied and adapted from Leaderboard.svelte --- */
    .screen-overlay {
        position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 100;
    }
    .results-box {
        background: linear-gradient(135deg, #1e3a8a, #3b0764); /* Deep blue/purple */
        padding: 2rem; border-radius: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        color: white; width: 600px; max-width: 90%; border: 4px solid #a5b4fc;
        animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes pop-in { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    
    .title { font-size: 3rem; font-weight: 700; text-align: center; color: #fde047; margin-bottom: 1rem; }
    .medal { vertical-align: middle; }
    
    .list-container {
        min-height: 200px; /* Adjusted height */
        max-height: 40vh;
        overflow-y: auto;
        background: rgba(0,0,0,0.2);
        border-radius: 1rem;
        padding: 1rem;
    }
    .score-list { list-style: none; padding: 0; margin: 0; }
    .score-row {
        display: grid; grid-template-columns: 50px 1fr 120px;
        align-items: center; padding: 0.75rem 0.5rem; font-size: 1.1rem;
    }
    .score-row:not(:last-child) { border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
    .score-row.local-player { background: rgba(59, 130, 246, 0.2); border-radius: 0.5rem; }
    
    .rank { font-weight: 700; font-size: 1.2rem; }
    .name { text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 1rem; }
    .score { text-align: right; font-weight: 600; }
    .button-container {
    display: flex;
    justify-content: center; /* This is the key: it centers the button horizontally */
    width: 100%;
}
    .back-to-lobby-button {
        background-color: #22c55e; color: white; font-size: 1.5rem; font-weight: 700;
        border: none; border-radius: 0.75rem; padding: 0.75rem 2.5rem; cursor: pointer;
        transition: transform 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.2); margin-top: 2rem;
    }
    .back-to-lobby-button:hover { transform: scale(1.05); }
</style>