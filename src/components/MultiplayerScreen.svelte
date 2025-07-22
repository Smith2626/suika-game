<script>
    import Gameboard from './Gameboard.svelte';
    import ComboDisplay from './ComboDisplay.svelte';
    import { createEventDispatcher } from 'svelte';
    import { FRUITS } from '../data/fruits.js';
    import { gameState } from '../lib/gameStore.js';

    const dispatch = createEventDispatcher();

    export let localPlayerName = '';
    export let players = [];
    export let score = 0;
    export let comboCount = 0;
    export let gameboardComponent = null;
    export let isInDanger = false;
    export let nextFruit = null;
    export let swapsRemaining = 0;
    export let shakesRemaining = 0;
    export let matchTimeRemaining = 0;

    $: formattedTime = `${Math.floor(matchTimeRemaining / 60)}:${(matchTimeRemaining % 60).toString().padStart(2, '0')}`;
</script>

<div class="mp-ui-layout">
    <header class="game-header">
        <div class="timer-display">{formattedTime}</div>
        <h2 class="mp-title">Multiplayer Match</h2>
        <button class="header-btn leave-btn" on:click={() => $gameState = 'multiplayer_menu'}>Leave Game</button>
    </header>

    <div class="mp-game-grid">
        <div class="opponents-panel">
            <h3 class="opponents-title">Opponents</h3>
            {#each players.filter(p => p.name !== localPlayerName) as opponent (opponent.name)}
                <div class="ui-box opponent-box" class:eliminated={opponent.isEliminated}>
                    <div class="box-title opponent-name" title={opponent.name}>{opponent.name}</div>
                    <div class="box-content score opponent-score">{opponent.score || 0}</div>
                    {#if opponent.isEliminated}
                        <div class="eliminated-overlay">ELIMINATED</div>
                    {/if}
                </div>
            {/each}
        </div>

        <div class="main-game-area">
            <Gameboard 
                bind:this={gameboardComponent}
                on:score={(e) => dispatch('score', e.detail)}
                on:nextfruitupdate={(e) => dispatch('nextfruitupdate', e.detail)}
                on:dangerupdate={(e) => dispatch('dangerupdate', e.detail)}
                on:gameover={() => dispatch('gameover')}
                on:comboupdate={(e) => dispatch('comboupdate', e.detail)}
            />
            <div class="danger-line" class:visible={isInDanger}></div>
        </div>

        <div class="ui-panel your-info">
            <div class="ui-box">
                <div class="box-title">YOUR SCORE</div>
                <div class="box-content score">{score}</div>
                <ComboDisplay {comboCount} />
            </div>
            <div class="ui-box">
                <div class="box-title">NEXT</div>
                <div class="box-content next-fruit">
                    {#if nextFruit}
                      <img src={nextFruit.imageSrc} alt={nextFruit.name} style="width:{nextFruit.radius * 1.5}px; border-radius: 50%;">
                    {:else}
                      <div class="fruit-placeholder"></div>
                    {/if}
                </div>
            </div>
            <div class="ui-box evolution-box">
                <div class="box-title">FRUIT EVOLUTION</div>
                <div class="evolution-path">
                    {#each FRUITS as fruit, i}
                        <img src={fruit.imageSrc} alt={fruit.name} class="fruit-evo-img" title={fruit.name}>
                        {#if i < FRUITS.length - 1}<div class="arrow">→</div>{/if}
                    {/each}
                </div>
            </div>
             <div class="ui-box">
                <div class="box-title">ABILITIES</div>
                <div class="box-content abilities">
                    <button class="ability-btn" on:click={() => dispatch('swap')} disabled={swapsRemaining === 0}>Swap ({swapsRemaining})</button>
                    <button class="ability-btn shake" on:click={() => dispatch('shake')} disabled={shakesRemaining === 0}>Shake ({shakesRemaining})</button>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .mp-ui-layout { width: 100%; height: 100vh; display: flex; flex-direction: column; padding: 1rem; box-sizing: border-box; gap: 1rem; }
    .game-header { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; width: 100%; max-width: 1200px; margin: 0 auto; }
    .timer-display { font-size: 2rem; font-weight: 700; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
    .mp-title { font-size: 2rem; font-weight: 700; color: #fde047; text-align: center; }
    .header-btn { background: #a0522d; color: white; border: 2px solid #633b1d; padding: 0.5rem 1rem; border-radius: 0.5rem; font-family: inherit; font-weight: 600; cursor: pointer; justify-self: end; }
    .mp-game-grid { display: grid; grid-template-columns: 200px 1fr 200px; gap: 2rem; width: 100%; max-width: 1200px; margin: 0 auto; align-items: flex-start; }
    .main-game-area { position: relative; display: flex; justify-content: center; }
    .opponents-panel, .your-info { display: flex; flex-direction: column; gap: 1.5rem; }
    .danger-line { position: absolute; top: 18px; left: 32px; right: 32px; height: 3px; background: #ff3b30; box-shadow: 0 0 10px #ff3b30; z-index: 10; border-radius: 3px; opacity: 0; transition: opacity 0.3s; }
    .danger-line.visible { opacity: 0.8; }
    .ui-box { background-color: #a0522d; color: white; border-radius: 1rem; padding: 1rem; text-align: center; width: 200px; border: 4px solid #8B4513; }
    .box-title { font-size: 0.9rem; font-weight: 500; color: #ffd700; margin-bottom: 0.5rem; }
    .box-content.score { font-size: 2.5rem; font-weight: 700; }
    .next-fruit { height: 80px; display:flex; justify-content:center; align-items:center; }
    .fruit-placeholder { width: 60px; height: 60px; background-color: rgba(0,0,0,0.2); border-radius: 50%; }
    .evolution-box { height: auto; }
    .evolution-path { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px; }
    .fruit-evo-img { width: 24px; height: 24px; border-radius: 50%; }
    .arrow { color: #ffd700; font-size: 1rem; }
    .abilities { display: flex; justify-content: space-around; gap: 0.5rem; }
    .ability-btn { background-color: #007aff; color: white; border: none; border-radius: 8px; padding: 0.5rem 1rem; font-family: inherit; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .ability-btn:hover:not(:disabled) { transform: scale(1.05); }
    .ability-btn.shake { background-color: #ff3b30; }
    .ability-btn:disabled { background-color: #555; opacity: 0.6; }
    .opponents-title { font-size: 1.5rem; font-weight: 600; color: #fde047; text-align: center; margin-bottom: -0.5rem; }
    .opponent-box { width: 100%; position: relative; }
    .opponent-name { text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
    .opponent-score { font-size: 2rem; }
    .opponent-box.eliminated { opacity: 0.5; background: #444; }
    .eliminated-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; color: #ff3b30; border-radius: 0.75rem; text-transform: uppercase; letter-spacing: 2px; }
</style>