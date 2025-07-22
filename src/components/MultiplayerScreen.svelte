<script>
    import Gameboard from './Gameboard.svelte';
    import ComboDisplay from './ComboDisplay.svelte';
    import { createEventDispatcher } from 'svelte';
    import { FRUITS } from '../data/fruits.js';
    import { gameState } from '../lib/gameStore.js';

    const dispatch = createEventDispatcher();
    export let localPlayerName = '', players = [], score = 0, comboCount = 0, gameboardComponent = null;
    export let isInDanger = false, nextFruit = null, swapsRemaining = 0, shakesRemaining = 0, matchTimeRemaining = 0;
    $: formattedTime = `${Math.floor(matchTimeRemaining / 60)}:${(matchTimeRemaining % 60).toString().padStart(2, '0')}`;
</script>

<div class="screen-wrapper">
    <div class="main-grid">
        <header class="game-header">
            <div class="timer-display">{formattedTime}</div>
            <h2 class="mp-title">Multiplayer Match</h2>
            <button class="header-btn leave-btn" on:click={() => dispatch('leave')}>Leave Game</button>
        </header>

        <div class="panel-top">
             <div class="ui-box">
                <div class="box-title">YOUR SCORE</div><div class="box-content score">{score}</div><ComboDisplay {comboCount} />
            </div>
            <div class="ui-box">
                <div class="box-title">NEXT</div>
                <div class="box-content next-fruit">
                    {#if nextFruit}<img src={nextFruit.imageSrc} alt={nextFruit.name} style="width:{nextFruit.radius * 1.5}px;">{:else}<div class="fruit-placeholder"></div>{/if}
                </div>
            </div>
        </div>

        <div class="game-board-area">
            <Gameboard bind:this={gameboardComponent} on:score on:nextfruitupdate on:dangerupdate on:gameover on:comboupdate />
            <div class="danger-line" class:visible={isInDanger}></div>
        </div>
        
        <div class="panel-middle">
            <div class="ui-box">
                <div class="box-title">ABILITIES</div>
                <div class="box-content abilities">
                    <button class="ability-btn" on:click={() => dispatch('swap')} disabled={swapsRemaining === 0}>Swap ({swapsRemaining})</button>
                    <button class="ability-btn shake" on:click={() => dispatch('shake')} disabled={shakesRemaining === 0}>Shake ({shakesRemaining})</button>
                </div>
            </div>
        </div>
        
        <div class="panel-bottom">
            <div class="ui-box opponents-box">
                <h3 class="box-title">Opponents</h3>
                {#each players.filter(p => p.name !== localPlayerName) as opponent (opponent.name)}
                    <div class="opponent-row" class:eliminated={opponent.isEliminated}>
                        <span class="opponent-name" title={opponent.name}>{opponent.name}</span>
                        <span class="opponent-score">{opponent.score || 0}</span>
                        {#if opponent.isEliminated}<div class="eliminated-overlay">OUT</div>{/if}
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    :root {
        --board-width: 380px;
        --panel-width: 200px;
        --gap: 2rem;
    }
    .screen-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        box-sizing: border-box;
    }

    /* --- MOBILE & TABLET LAYOUT --- */
    .main-grid {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        width: 100%;
        max-width: var(--board-width);
    }
    .game-header {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 0.5rem;
    }
    .timer-display { font-size: 1.5rem; font-weight: 700; color: white; }
    .mp-title { font-size: 1.5rem; font-weight: 700; color: #fde047; text-align: center; }
    .header-btn { background: #a0522d; color: white; border: 2px solid #633b1d; padding: 0.5rem; border-radius: 0.5rem; font-size: 0.8rem; font-family: inherit; font-weight: 600; cursor: pointer; justify-self: end; }

    .panel-top, .panel-middle {
        display: flex;
        gap: 1rem;
        width: 100%;
    }
    .panel-bottom {
        width: 100%;
    }
    .ui-box {
        background-color: #a0522d; color: white; border-radius: 1rem;
        padding: 1rem; text-align: center; border: 4px solid #8B4513;
        width: 100%;
        box-sizing: border-box;
    }
    .panel-top .ui-box, .panel-middle .ui-box {
        flex: 1;
    }

    /* --- DESKTOP LAYOUT --- */
    @media (min-width: 900px) {
        .main-grid {
            display: grid;
            max-width: 1200px;
            grid-template-columns: var(--panel-width) var(--board-width) var(--panel-width);
            grid-template-rows: auto 1fr;
            grid-template-areas:
                "left-panel header right-panel"
                "left-panel game   right-panel";
            gap: var(--gap);
            align-items: flex-start;
        }
        .game-header { grid-area: header; grid-template-columns: 1fr auto 1fr; }
        .timer-display, .mp-title { font-size: 2rem; }
        .header-btn { padding: 0.5rem 1rem; font-size: 1rem; }
        
        /* The left panel on desktop is the opponents */
        .panel-top {
            grid-area: left-panel;
            flex-direction: column;
            gap: 1.5rem;
        }
        .game-board-area { grid-area: game; }
        /* The middle and bottom panels combine to form the right panel on desktop */
        .panel-middle, .panel-bottom {
            grid-area: right-panel;
            flex-direction: column;
            gap: 1.5rem;
            width: var(--panel-width);
        }
        .ui-box { width: var(--panel-width); }
        .opponents-box {
            order: -1; /* Move opponents to the top of the column on desktop */
        }
    }
    
    /* SHARED STYLES */
    .game-board-area { position: relative; display: flex; justify-content: center; }
    .box-title { font-size: 0.9rem; font-weight: 500; color: #ffd700; margin-bottom: 0.5rem; }
    .box-content.score { font-size: 2.5rem; font-weight: 700; }
    .next-fruit { height: 80px; display:flex; justify-content:center; align-items:center; }
    .next-fruit img { border-radius: 50%; }
    .abilities { display: flex; justify-content: space-around; gap: 0.5rem; }
    .ability-btn { background-color: #007aff; color: white; border: none; border-radius: 8px; padding: 0.5rem 1rem; font-family: inherit; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .ability-btn.shake { background-color: #ff3b30; }
    .ability-btn:disabled { background-color: #555; opacity: 0.6; }
    .danger-line { position: absolute; top: 18px; left: 32px; right: 32px; height: 3px; background: #ff3b30; box-shadow: 0 0 10px #ff3b30; z-index: 10; border-radius: 3px; opacity: 0; transition: opacity 0.3s; }
    .danger-line.visible { opacity: 0.8; }
    
    /* MULTIPLAYER-SPECIFIC STYLES */
    .opponents-box { padding: 0.5rem; }
    .opponent-row { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0.5rem; position: relative; }
    .opponent-name { text-overflow: ellipsis; overflow: hidden; white-space: nowrap; font-weight: 600; }
    .opponent-score { font-size: 1.5rem; font-weight: 700; }
    .opponent-row.eliminated { opacity: 0.5; }
    .eliminated-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1rem; color: #ff3b30; border-radius: 0.5rem; }
</style>