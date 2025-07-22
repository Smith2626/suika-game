<script>
    import { gameState } from '../lib/gameStore.js';
    import { supabase } from '../lib/supabaseClient.js';
    
    export let score = 0;
    let playerName = '', submissionState = 'idle', lastSubmittedName = '';

    async function submitScore() {
        if (!playerName.trim() || submissionState !== 'idle') return;
        submissionState = 'submitting';
        lastSubmittedName = playerName.trim().slice(0, 15);
        try {
            const { error } = await supabase.from('leaderboard').insert([{ player_name: lastSubmittedName, score: score }]);
            if (error) throw error;
            submissionState = 'submitted';
        } catch (e) {
            submissionState = 'error'; console.error(e);
        }
    }

    function playAgain() {
        $gameState = 'menu'; // Go back to the menu
    }
</script>

<div class="screen-overlay">
    <div class="game-over-box">
        <h2 class="title">Game Over!</h2>
        <p class="final-score">{score}</p>
        <div class="submission-area">
            {#if submissionState === 'submitted'}
                <p class="success-text">Score submitted for {lastSubmittedName}!</p>
            {:else}
                <div class="input-group">
                    <input type="text" bind:value={playerName} placeholder="Enter Name" disabled={submissionState === 'submitting'}>
                    <button on:click={submitScore} disabled={submissionState === 'submitting'}>
                        {#if submissionState === 'submitting'}Saving...{:else}Submit{/if}
                    </button>
                </div>
                {#if submissionState === 'error'}<p class="error-text">Submission failed. Try again.</p>{/if}
            {/if}
        </div>
        <button on:click={playAgain} class="restart-button">Play Again</button>
    </div>
</div>

<style>
    .screen-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .game-over-box { background: linear-gradient(135deg, #ff8c00, #ff4500); padding: 2rem; border-radius: 1rem; text-align: center; color: white; }
    .final-score { font-size: 3rem; font-weight: bold; }
    .submission-area { margin: 1rem 0; }
    .input-group { display: flex; gap: 0.5rem; }
</style>