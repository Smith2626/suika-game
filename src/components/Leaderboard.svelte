<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import { supabase } from '../lib/supabaseClient.js';
    import { AudioManager } from '../lib/AudioManager.js'; // Import the AudioManager

    const dispatch = createEventDispatcher();

    let scores = [];
    let loadingState = 'loading';

    onMount(async () => {
        try {
            const { data, error } = await supabase
                .from('leaderboard')
                .select('player_name, score')
                .order('score', { ascending: false })
                .limit(10);
            if (error) { throw error; }
            scores = data;
            loadingState = 'loaded';
        } catch (error) {
            console.error("Error fetching leaderboard:", error.message);
            loadingState = 'error';
        }
    });

    function handleClose() {
        AudioManager.play('click'); // Play click sound
        dispatch('close');
    }
</script>

<div class="overlay" on:click={handleClose}>
    <div class="leaderboard-box" on:click|stopPropagation>
        <h2 class="title">Top 10 Scores</h2>
        <div class="list-container">
            {#if loadingState === 'loading'}
                <p>Loading scores...</p>
            {:else if loadingState === 'error'}
                <p class="error-text">Could not load leaderboard.</p>
            {:else if scores.length === 0}
                <p>No scores yet. Be the first!</p>
            {:else}
                <ol class="score-list">
                    {#each scores as entry, i}
                        <li class="score-row">
                            <span class="rank">{i + 1}</span>
                            <span class="name">{entry.player_name}</span>
                            <span class="score">{entry.score.toLocaleString()}</span>
                        </li>
                    {/each}
                </ol>
            {/if}
        </div>
        <button class="close-button" on:click={handleClose}>
            Close
        </button>
    </div>
</div>

<style>
    .overlay { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.75); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .leaderboard-box { background: linear-gradient(135deg, #1e3a8a, #3b0764); padding: 2rem; border-radius: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: center; color: white; width: 500px; max-width: 90%; border: 4px solid #a5b4fc; animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    @keyframes pop-in { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .title { font-size: 2.5rem; font-weight: 700; margin: 0 0 1.5rem 0; color: #fde047; }
    .list-container { min-height: 300px; background: rgba(0,0,0,0.2); border-radius: 1rem; padding: 1rem; }
    .score-list { list-style: none; padding: 0; margin: 0; }
    .score-row { display: grid; grid-template-columns: 50px 1fr 100px; align-items: center; padding: 0.75rem 0.5rem; font-size: 1.1rem; }
    .score-row:not(:last-child) { border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
    .rank { font-weight: 700; font-size: 1.2rem; }
    .score-row:first-child .rank { color: #fde047; }
    .score-row:nth-child(2) .rank { color: #d1d5db; }
    .score-row:nth-child(3) .rank { color: #f59e0b; }
    .name { text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .score { text-align: right; font-weight: 600; }
    .error-text { color: #fca5a5; }
    .close-button { background-color: #4b5563; color: white; font-size: 1.2rem; font-weight: 600; border: none; border-radius: 0.75rem; padding: 0.5rem 2rem; cursor: pointer; transition: background-color 0.2s; margin-top: 1.5rem; }
    .close-button:hover { background-color: #6b7280; }
</style>