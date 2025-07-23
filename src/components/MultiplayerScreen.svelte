<script>
    import Gameboard from './Gameboard.svelte';
    import ComboDisplay from './ComboDisplay.svelte';
    import { createEventDispatcher } from 'svelte';
    import { FRUITS } from '../data/fruits.js';

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

    let swapBlockedMessage = '';
    let gameOver = false;
    $: buttonsDisabled = !gameboardComponent || gameOver;
    $: formattedTime = `${Math.floor(matchTimeRemaining / 60)}:${(matchTimeRemaining % 60).toString().padStart(2, '0')}`;
    $: console.log('MultiplayerScreen props: swapsRemaining=', swapsRemaining, 'shakesRemaining=', shakesRemaining, 'gameboardComponent=', gameboardComponent, 'gameOver=', gameOver);
    $: console.log('Opponents updated:', players.filter(p => p.name !== localPlayerName));
    $: if (gameboardComponent) {
        console.log('Dispatching gameboardReady with gameboardComponent:', gameboardComponent);
        dispatch('gameboardReady', gameboardComponent);
    }
</script>

<div class="mp-ui-layout" style="max-height: calc(100vh - 2rem); overflow-y: auto;">
    <header class="game-header">
        <div class="timer-display">{formattedTime}</div>
        <h2 class="mp-title">Multiplayer Match</h2>
        <button class="header-btn leave-btn" on:click={() => dispatch('leave')}>Leave Game</button>
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
                isMultiplayer={true}
                bind:this={gameboardComponent}
                on:score={(e) => dispatch('score', e.detail)}
                on:nextfruitupdate={(e) => dispatch('nextfruitupdate', e.detail)}
                on:dangerupdate={(e) => dispatch('dangerupdate', e.detail)}
                on:gameover={() => {
                    gameOver = true;
                    dispatch('gameover');
                }}
                on:comboupdate={(e) => dispatch('comboupdate', e.detail)}
                on:swapBlocked={() => {
                    swapBlockedMessage = 'Cannot swap while dropping!';
                    setTimeout(() => { swapBlockedMessage = ''; }, 1000);
                }}
            />
            <div class="danger-line" class:visible={isInDanger}></div>
            {#if gameOver}
                <div class="game-over-overlay">
                    <div class="game-over-text">Game Over</div>
                    <div class="final-score">Your Score: {score}</div>
                    <button class="header-btn" on:click={() => dispatch('leave')}>Back to Menu</button>
                </div>
            {/if}
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
                    <button class="ability-btn" on:click={() => { console.log('Swap button clicked'); dispatch('swap'); }} disabled={buttonsDisabled || swapsRemaining === 0}>Swap ({swapsRemaining})</button>
                    <button class="ability-btn shake" on:click={() => { console.log('Shake button clicked'); dispatch('shake'); }} disabled={buttonsDisabled || shakesRemaining === 0}>Shake ({shakesRemaining})</button>
                </div>
            </div>
        </div>
    </div>
    {#if swapBlockedMessage}
        <div class="swap-blocked-message">{swapBlockedMessage}</div>
    {/if}
</div>

<style>
    .mp-ui-layout {
        width: 100%;
        display: flex;
        flex-direction: column;
        padding: 0.5rem;
        box-sizing: border-box;
        gap: 0.5rem;
        margin: 0 auto;
    }
    .game-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        max-width: 1000px;
        margin: 0 auto;
        padding: 0.3rem 0;
        gap: 0.5rem;
    }
    .timer-display {
        font-size: clamp(0.9rem, 2.5vw, 1.5rem);
        font-weight: 700;
        color: white;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    }
    .mp-title {
        font-size: clamp(0.9rem, 2.5vw, 1.5rem);
        font-weight: 700;
        color: #fde047;
        text-align: center;
        flex: 1;
    }
    .header-btn {
        background: #a0522d; 
        color: white; 
        border: 2px solid #633b1d; 
        padding: 0.3rem 0.6rem; 
        border-radius: 0.5rem; 
        font-family: inherit; 
        font-weight: 600; 
        cursor: pointer;
        font-size: clamp(0.7rem, 2vw, 0.9rem);
    }
    .mp-game-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        width: 100%;
        max-width: 1000px;
        margin: 0 auto;
        align-items: flex-start;
        justify-content: center;
    }
    .main-game-area {
        position: relative;
        width: 100%;
        max-width: 400px;
        margin: 0 auto;
    }
    .opponents-panel, .your-info {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        width: 100%;
        max-width: 200px;
        min-width: 150px;
    }
    .danger-line { 
        position: absolute; 
        top: 80px; 
        left: 12px; 
        right: 12px; 
        height: 3px; 
        background: #ff3b30; 
        box-shadow: 0 0 10px #ff3b30; 
        z-index: 10; 
        border-radius: 3px; 
        opacity: 0; 
        transition: opacity 0.3s; 
    }
    .danger-line.visible { 
        opacity: 0.8; 
    }
    .ui-box { 
        background-color: #a0522d; 
        color: white; 
        border-radius: 1rem; 
        padding: 0.4rem; 
        text-align: center; 
        width: 100%; 
        max-width: 200px; 
        min-width: 150px;
        margin: 0 auto;
        border: 3px solid #8B4513; 
        box-sizing: border-box;
    }
    .box-title { 
        font-size: clamp(0.5rem, 1.5vw, 0.7rem); 
        font-weight: 500; 
        color: #ffd700; 
        margin-bottom: 0.2rem; 
    }
    .box-content.score { 
        font-size: clamp(1rem, 3vw, 1.5rem); 
        font-weight: 700; 
    }
    .next-fruit { 
        height: clamp(40px, 12vw, 60px); 
        display: flex; 
        justify-content: center; 
        align-items: center; 
    }
    .fruit-placeholder { 
        width: clamp(25px, 8vw, 40px); 
        height: clamp(25px, 8vw, 40px); 
        background-color: rgba(0,0,0,0.2); 
        border-radius: 50%; 
    }
    .evolution-box { 
        height: auto; 
    }
    .evolution-path { 
        display: flex; 
        flex-wrap: wrap; 
        justify-content: center; 
        align-items: center; 
        gap: 2px; 
    }
    .fruit-evo-img { 
        width: clamp(12px, 4vw, 18px); 
        height: clamp(12px, 4vw, 18px); 
        border-radius: 50%; 
    }
    .arrow { 
        color: #ffd700; 
        font-size: clamp(0.5rem, 1.5vw, 0.7rem); 
    }
    .abilities { 
        display: flex; 
        justify-content: space-around; 
        gap: 0.3rem; 
    }
    .ability-btn { 
        background-color: #007aff; 
        color: white; 
        border: none; 
        border-radius: 6px; 
        padding: clamp(0.15rem, 1vw, 0.3rem) clamp(0.3rem, 1.5vw, 0.6rem); 
        font-family: inherit; 
        font-weight: 600; 
        cursor: pointer; 
        transition: all 0.2s; 
        font-size: clamp(0.6rem, 1.5vw, 0.8rem);
    }
    .ability-btn:hover:not(:disabled) { 
        transform: scale(1.05); 
    }
    .ability-btn.shake { 
        background-color: #ff3b30; 
    }
    .ability-btn:disabled { 
        background-color: #555; 
        opacity: 0.6; 
    }
    .swap-blocked-message {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 0, 0, 0.8);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        z-index: 200;
        font-size: 0.9rem;
    }
    .opponents-title { 
        font-size: clamp(0.9rem, 2.5vw, 1.2rem); 
        font-weight: 600; 
        color: #fde047; 
        text-align: center; 
        margin-bottom: 0.3rem; 
    }
    .opponent-box { 
        width: 100%; 
        position: relative; 
    }
    .opponent-name { 
        text-overflow: ellipsis; 
        overflow: hidden; 
        white-space: nowrap; 
    }
    .opponent-score { 
        font-size: clamp(0.9rem, 2.5vw, 1.8rem); 
    }
    .opponent-box.eliminated { 
        opacity: 0.5; 
        background: #444; 
    }
    .eliminated-overlay { 
        position: absolute; 
        inset: 0; 
        background: rgba(0,0,0,0.5); 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-weight: bold; 
        font-size: 1rem; 
        color: #ff3b30; 
        border-radius: 0.75rem; 
        text-transform: uppercase; 
        letter-spacing: 1px; 
    }
    .game-over-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 200;
        color: white;
        font-size: clamp(1.2rem, 3vw, 1.5rem);
        font-weight: 700;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    }
    .game-over-text {
        font-size: clamp(1.5rem, 4vw, 2rem);
        color: #ff3b30;
        margin-bottom: 0.3rem;
    }
    .final-score {
        font-size: clamp(1rem, 2.5vw, 1.2rem);
        margin-bottom: 0.3rem;
    }
    @media (max-width: 800px) {
        .mp-game-grid {
            flex-direction: column;
            align-items: center;
        }
        .opponents-panel, .your-info {
            max-width: 90vw;
            min-width: 150px;
        }
        .main-game-area {
            max-width: 90vw;
        }
    }
    @media (max-width: 400px) {
        .game-header { 
            padding: 0.2rem 0; 
        }
        .header-btn { 
            padding: 0.2rem 0.4rem; 
            font-size: clamp(0.6rem, 2vw, 0.7rem);
        }
        .ui-box { 
            padding: 0.3rem; 
        }
        .box-content.score {
            font-size: clamp(0.9rem, 3vw, 1.2rem);
        }
        .next-fruit { 
            height: clamp(35px, 10vw, 40px); 
        }
        .fruit-placeholder { 
            width: clamp(20px, 6vw, 25px); 
            height: clamp(20px, 6vw, 25px); 
        }
        .fruit-evo-img { 
            width: clamp(10px, 3vw, 12px); 
            height: clamp(10px, 3vw, 12px); 
        }
        .ability-btn { 
            padding: clamp(0.1rem, 0.8vw, 0.15rem) clamp(0.2rem, 1.2vw, 0.3rem); 
            font-size: clamp(0.5rem, 1.2vw, 0.6rem); 
        }
        .opponents-title { 
            font-size: clamp(0.8rem, 2vw, 0.9rem); 
        }
        .opponent-score { 
            font-size: clamp(0.8rem, 2vw, 1.5rem); 
        }
        .eliminated-overlay { 
            font-size: clamp(0.6rem, 1.5vw, 0.7rem); 
        }
    }
</style>