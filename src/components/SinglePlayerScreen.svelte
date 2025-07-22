<script>
    import Gameboard from './Gameboard.svelte';
    import ComboDisplay from './ComboDisplay.svelte';
    import { createEventDispatcher } from 'svelte';
    import { FRUITS } from '../data/fruits.js';

    const dispatch = createEventDispatcher();
    export let score=0, highScore=0, nextFruit=null, isInDanger=false, swapsRemaining=2, shakesRemaining=1;
    export let gameboardComponent = null;
    export let comboCount = 0;
</script>

<div class="screen-wrapper">
    <div class="main-grid">
        <header class="game-header">
            <button on:click={() => dispatch('newgame')} class="header-btn">New Game</button>
            <button on:click={() => dispatch('showleaderboard')} class="header-btn">Leaderboard</button>
        </header>

        <div class="panel-top">
            <div class="ui-box">
                <div class="box-title">SCORE</div><div class="box-content score">{score}</div><ComboDisplay count={comboCount} />
            </div>
            <div class="ui-box high-score-box">
                <div class="box-title">HIGH SCORE</div><div class="box-content high-score">{highScore}</div>
            </div>
        </div>
        
        <div class="game-board-area">
            <Gameboard bind:this={gameboardComponent} on:score on:nextfruitupdate on:dangerupdate on:gameover on:comboupdate />
            <div class="danger-line" class:visible={isInDanger}></div>
        </div>

        <div class="panel-middle">
            <div class="ui-box">
                <div class="box-title">NEXT</div>
                <div class="box-content next-fruit">
                    {#if nextFruit}<img src={nextFruit.imageSrc} alt={nextFruit.name} style="width:{nextFruit.radius * 1.5}px;">{:else}<div class="fruit-placeholder"></div>{/if}
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

        <div class="panel-bottom">
            <div class="ui-box evolution-box">
                <div class="box-title">FRUIT EVOLUTION</div>
                <div class="evolution-path">
                    {#each FRUITS as fruit, i}<img src={fruit.imageSrc} alt={fruit.name} class="fruit-evo-img" title={fruit.name}>{#if i < FRUITS.length - 1}<div class="arrow">→</div>{/if}{/each}
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    :root {
        --board-width: 380px; /* Base width of the game board */
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
    
    /* --- MOBILE & TABLET LAYOUT (The Default) --- */
    .main-grid {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        width: 100%;
        max-width: var(--board-width); /* Prevents it from getting too wide on mobile */
    }
    .game-header {
        display: flex;
        gap: 1rem;
        width: 100%;
        justify-content: center;
    }
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
        flex: 1; /* Make boxes in the same row share space equally */
    }

    /* --- DESKTOP LAYOUT (Media Query) --- */
    @media (min-width: 900px) {
        .main-grid {
            display: grid;
            max-width: 1200px; /* Allow it to grow wider */
            grid-template-columns: var(--panel-width) var(--board-width) var(--panel-width);
            grid-template-rows: auto 1fr;
            grid-template-areas:
                "left-panel header right-panel"
                "left-panel game   right-panel";
            gap: var(--gap);
            align-items: flex-start; /* Align to the top */
        }
        .game-header { grid-area: header; }
        .panel-top { grid-area: left-panel; flex-direction: column; }
        .game-board-area { grid-area: game; }
        /* Middle and Bottom panels are combined into the right panel on desktop */
        .panel-middle, .panel-bottom {
            grid-area: right-panel;
            flex-direction: column;
            gap: 1.5rem;
            width: var(--panel-width);
        }
        .high-score-box { display: block; } /* Ensure high score is visible on desktop */
    }
    /* Small phone specific adjustments */
    @media (max-width: 400px) {
        /* Hide high score on very narrow screens to make room */
        .high-score-box { display: none; }
        .game-header { transform: scale(0.9); }
    }

    /* --- GENERAL STYLES (Unchanged for the most part) --- */
    .game-board-area { position: relative; }
    .header-btn { background: #a0522d; color: white; border: 2px solid #633b1d; padding: 0.5rem 1rem; border-radius: 0.5rem; font-family: inherit; font-weight: 600; cursor: pointer; }
    .box-title { font-size: 0.9rem; font-weight: 500; color: #ffd700; margin-bottom: 0.5rem; }
    .box-content.score { font-size: 2.5rem; font-weight: 700; }
    .box-content.high-score { font-size: 1.5rem; }
    .next-fruit { height: 80px; display:flex; justify-content:center; align-items:center; }
    .next-fruit img { border-radius: 50%; }
    .evolution-path { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px; }
    .fruit-evo-img { width: 24px; height: 24px; border-radius: 50%; }
    .arrow { color: #ffd700; font-size: 1rem; }
    .abilities { display: flex; justify-content: space-around; gap: 0.5rem; }
    .ability-btn { background-color: #007aff; color: white; border: none; border-radius: 8px; padding: 0.5rem 1rem; font-family: inherit; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .ability-btn.shake { background-color: #ff3b30; }
    .ability-btn:disabled { background-color: #555; opacity: 0.6; }
    .danger-line { position: absolute; top: 18px; left: 32px; right: 32px; height: 3px; background: #ff3b30; box-shadow: 0 0 10px #ff3b30; z-index: 10; border-radius: 3px; opacity: 0; transition: opacity 0.3s; }
    .danger-line.visible { opacity: 0.8; }
</style>