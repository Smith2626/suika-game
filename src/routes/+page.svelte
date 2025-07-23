<script>
    import MenuScreen from '../components/MenuScreen.svelte';
    import Gameboard from '../components/Gameboard.svelte';
    import GameOverScreen from '../components/GameOverScreen.svelte';
    import Leaderboard from '../components/Leaderboard.svelte';
    import ComboDisplay from '../components/ComboDisplay.svelte';
    import MultiplayerMenu from '../components/MultiplayerMenu.svelte';
    import LobbyRoom from '../components/LobbyRoom.svelte';
    import NameInputModal from '../components/NameInputModal.svelte';
    import MultiplayerScreen from '../components/MultiplayerScreen.svelte';
    import MultiplayerResults from '../components/MultiplayerResults.svelte';
    import { FRUITS } from '../data/fruits.js';
    import { onMount } from 'svelte';
    import { AudioManager } from '../lib/AudioManager.js';
    import { gameState } from '../lib/gameStore.js';
    import { supabase } from '../lib/supabaseClient.js';
    
    let score=0, highScore=0, nextFruit=null, isInDanger=false, swapsRemaining=2, shakesRemaining=1;
    let gameboardComponent = null, showLeaderboard=false, comboCount=0, gameId=0;
    let showNameInput=false, nameInputAction=null, roomCode='', isHost=false, localPlayerName='', gameChannel=null;
    let players = [];
    let finalRankings = [];
    const MATCH_DURATION_SECONDS = 300;
    let matchTimeRemaining = MATCH_DURATION_SECONDS;
    let matchTimerInterval = null;

    const HIGH_SCORE_KEY = 'suikaGameHighScore';

    onMount(() => {
        highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
    });

    gameState.subscribe(value => {
        if (value === 'playing' || value === 'playing_multiplayer') {
            score=0; swapsRemaining=2; shakesRemaining=1; nextFruit=null; isInDanger=false; comboCount=0;
            gameId++;
            if (value === 'playing_multiplayer') {
                players = players.map(p => ({ ...p, score: 0, isEliminated: false }));
                finalRankings = [];
            }
        }
        if (value === 'lobby') {
            players = players.map(p => ({ ...p, score: 0, isEliminated: false }));
            finalRankings = [];
        }
        if (value !== 'lobby' && value !== 'playing_multiplayer' && value !== 'multiplayer_results' && gameChannel) {
            supabase.removeChannel(gameChannel);
            gameChannel = null; players = []; finalRankings = [];
            if (matchTimerInterval) cancelAnimationFrame(matchTimerInterval);
        }
    });

    function handleScoreUpdate(e) {
        score += e.detail.points;
        if (score > highScore) { 
            highScore = score;
            localStorage.setItem(HIGH_SCORE_KEY, highScore);
        }
        if ($gameState === 'playing_multiplayer' && gameChannel) {
            gameChannel.send({
                type: 'broadcast', event: 'SCORE_UPDATE', payload: { name: localPlayerName, score: score }
            });
        }
    }

    function handleComboUpdate(e) { comboCount = e.detail.count; }
    function handleNextFruitUpdate(e) { nextFruit = e.detail.fruit; }
    function handleDangerUpdate(e) { isInDanger = e.detail.status; }
    
    function handleGameOver() {
        AudioManager.play('gameover');
        if ($gameState === 'playing_multiplayer' && gameChannel) {
            console.log('Game over in multiplayer: stopping gameboard for', localPlayerName);
            if (gameboardComponent) { gameboardComponent.stopGame(); }
            gameChannel.send({
                type: 'broadcast', event: 'PLAYER_LOST', payload: { name: localPlayerName, finalScore: score }
            });
        } else {
            $gameState = 'gameover';
        }
    }

    function handleSwap() {
        console.log('handleSwap called: swapsRemaining=', swapsRemaining, 'gameboardComponent=', gameboardComponent);
        if (swapsRemaining > 0 && gameboardComponent) {
            swapsRemaining--;
            if (typeof gameboardComponent.swapFruits === 'function') {
                gameboardComponent.swapFruits();
                console.log('swapFruits called successfully');
            } else {
                console.error('swapFruits is not a function on gameboardComponent:', gameboardComponent);
            }
        } else {
            console.error('Swap failed: swapsRemaining=', swapsRemaining, 'gameboardComponent=', gameboardComponent);
        }
    }

    function handleShake() {
        console.log('handleShake called: shakesRemaining=', shakesRemaining, 'gameboardComponent=', gameboardComponent);
        if (shakesRemaining > 0 && gameboardComponent) {
            shakesRemaining--;
            if (typeof gameboardComponent.shakeWorld === 'function') {
                gameboardComponent.shakeWorld();
                console.log('shakeWorld called successfully');
            } else {
                console.error('shakeWorld is not a function on gameboardComponent:', gameboardComponent);
            }
        } else {
            console.error('Shake failed: shakesRemaining=', shakesRemaining, 'gameboardComponent=', gameboardComponent);
        }
    }

    function handleGameboardReady(e) {
        console.log('Received gameboardComponent:', e.detail);
        gameboardComponent = e.detail;
    }

    function handleShowLeaderboard() { AudioManager.play('click'); showLeaderboard = true; }
    
    function createRoom() {
        nameInputAction = 'create';
        $gameState = 'name_input';
    }
    function joinRoom(event) {
        const code = event.detail.code.toUpperCase();
        if (!code || code.length !== 4) { alert("Please enter a valid 4-digit code."); return; }
        roomCode = code;
        nameInputAction = 'join';
        $gameState = 'name_input';
    }
    async function handleNameSubmit(event) {
        localPlayerName = event.detail.name.slice(0, 15);
        if (nameInputAction === 'create') {
            isHost = true;
            roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        } else { isHost = false; }
        $gameState = 'lobby';
        await connectToChannel();
    }
    
    async function connectToChannel() {
        const channelName = `suika-room-${roomCode}`;
        gameChannel = supabase.channel(channelName, { config: { broadcast: { self: true }, presence: { key: localPlayerName } } });

        let activePlayers = new Set();
        let eliminatedPlayers = [];

        gameChannel.on('presence', { event: 'sync' }, () => {
            const presenceState = gameChannel.presenceState();
            const currentPlayers = Object.keys(presenceState).length;
            if (currentPlayers > 4) {
                console.log('Lobby full: max 4 players, current=', currentPlayers);
                alert('Lobby is full (max 4 players). Please join another room.');
                supabase.removeChannel(gameChannel);
                gameChannel = null;
                $gameState = 'multiplayer_menu';
                return;
            }
            players = Object.keys(presenceState).map(key => ({
                name: key,
                isHost: presenceState[key][0].isHost,
                score: 0,
                isEliminated: false
            }));
            console.log('Presence sync: players=', players, 'activePlayers=', [...activePlayers]);
        });

        gameChannel.on('broadcast', { event: 'GAME_START' }, ({ payload }) => {
            console.log('Received GAME_START with startTime:', payload.startTime);
            $gameState = 'playing_multiplayer';
            activePlayers = new Set(players.map(p => p.name));
            eliminatedPlayers = [];
            players = players.map(p => ({ ...p, score: 0, isEliminated: false }));
            console.log('Game started: activePlayers=', [...activePlayers]);
            startMatchTimer(payload.startTime || Date.now());
        });
        
        gameChannel.on('broadcast', { event: 'SCORE_UPDATE' }, ({ payload }) => {
            const playerToUpdate = players.find(p => p.name === payload.name);
            if (playerToUpdate) {
                playerToUpdate.score = payload.score;
                players = [...players];
                console.log('Score updated for', payload.name, ': score=', payload.score);
            }
        });

        gameChannel.on('broadcast', { event: 'PLAYER_LOST' }, ({ payload }) => {
            console.log('Received PLAYER_LOST:', payload);
            if (!activePlayers.has(payload.name)) return;
            activePlayers.delete(payload.name);
            eliminatedPlayers.push({ name: payload.name, score: payload.finalScore });
            const playerToUpdate = players.find(p => p.name === payload.name);
            if (playerToUpdate) {
                playerToUpdate.isEliminated = true;
                players = [...players];
                console.log('Player', payload.name, 'marked as eliminated. activePlayers=', [...activePlayers]);
            }
            if (activePlayers.size <= 1) {
                console.log('Only one or zero players left, ending match');
                endMatch(activePlayers, eliminatedPlayers);
            }
        });

        function endMatch(survivors, eliminated) {
            console.log('endMatch called: survivors=', [...survivors], 'eliminated=', eliminated);
            if (matchTimerInterval) cancelAnimationFrame(matchTimerInterval);
            if (gameboardComponent) {
                gameboardComponent.stopGame();
                console.log('Stopped gameboard for remaining player');
            }
            const allPlayers = [
                ...[...survivors].map(winnerName => {
                    const winner = players.find(p => p.name === winnerName);
                    const winnerScore = winnerName === localPlayerName ? score : winner?.score || 0;
                    return { name: winnerName, score: winnerScore };
                }),
                ...eliminated
            ];
            finalRankings = allPlayers
                .sort((a, b) => {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    const playerA = players.find(p => p.name === a.name);
                    const playerB = players.find(p => p.name === b.name);
                    return (playerB?.isHost ? 1 : 0) - (playerA?.isHost ? 1 : 0);
                })
                .map((p, i) => ({ ...p, rank: i + 1 }));
            $gameState = 'multiplayer_results';
            console.log('Match ended: finalRankings=', finalRankings);
        }
        
        function startMatchTimer(startTime) {
            console.log('Starting timer with startTime:', startTime);
            if (matchTimerInterval) cancelAnimationFrame(matchTimerInterval);
            function updateTimer() {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const newTimeRemaining = MATCH_DURATION_SECONDS - elapsed;
                console.log('Timer update: elapsed=', elapsed, 'newTimeRemaining=', newTimeRemaining);
                if (newTimeRemaining !== matchTimeRemaining) matchTimeRemaining = newTimeRemaining;
                if (newTimeRemaining <= 0) {
                    matchTimeRemaining = 0;
                    console.log('Timer ended, calling endMatch');
                    endMatch(activePlayers, eliminatedPlayers);
                    if (isHost && $gameState === 'playing_multiplayer') {
                        console.log('Host sending TIME_UP');
                        gameChannel.send({ type: 'broadcast', event: 'TIME_UP' });
                    }
                } else {
                    matchTimerInterval = requestAnimationFrame(updateTimer);
                }
            }
            matchTimerInterval = requestAnimationFrame(updateTimer);
        }

        gameChannel.on('broadcast', { event: 'TIME_UP' }, () => {
            console.log('Received TIME_UP, calling endMatch');
            endMatch(activePlayers, eliminatedPlayers);
        });
        
        gameChannel.subscribe(async (status) => {
            console.log('Channel subscription status:', status);
            if (status === 'SUBSCRIBED') await gameChannel.track({ isHost });
        });
    }

    async function handleStartMultiplayerGame() {
        if (!isHost || !gameChannel) {
            console.log('Cannot start game: isHost=', isHost, 'gameChannel=', gameChannel);
            return;
        }
        console.log('Sending GAME_START broadcast with startTime:', Date.now());
        AudioManager.play('click');
        await gameChannel.send({ type: 'broadcast', event: 'GAME_START', payload: { startTime: Date.now() } });
    }
    
    function handleLeaveLobby() {
        AudioManager.play('click');
        $gameState = 'multiplayer_menu';
    }
</script>

<main style="min-height: 100vh; display: block; overflow-y: auto;">
    {#if $gameState === 'menu'}
        <MenuScreen />
    {:else if $gameState === 'multiplayer_menu'}
        <MultiplayerMenu on:create={createRoom} on:join={joinRoom} />
    {:else if $gameState === 'lobby'}
        <LobbyRoom {roomCode} {players} {localPlayerName} on:leave={handleLeaveLobby} on:startgame={handleStartMultiplayerGame} />
    {:else if $gameState === 'playing'}
        {#key gameId}
            <div class="game-ui-layout" style="max-height: calc(100vh - 2rem); overflow-y: auto;">
                <header class="game-header">
                    <button on:click={() => window.location.reload()} class="header-btn">New Game</button>
                    <button on:click={handleShowLeaderboard} class="header-btn">Leaderboard</button>
                </header>
                <div class="game-area-grid">
                    <div class="ui-panel left">
                        <div class="ui-box">
                            <div class="box-title">SCORE</div>
                            <div class="box-content score">{score}</div>
                            <ComboDisplay count={comboCount} />
                        </div>
                        <div class="ui-box">
                            <div class="box-title">HIGH SCORE</div>
                            <div class="box-content high-score">{highScore}</div>
                        </div>
                    </div>
                    <div class="game-board-area">
                        <Gameboard 
                            isMultiplayer={false}
                            bind:this={gameboardComponent} 
                            on:score={handleScoreUpdate} 
                            on:nextfruitupdate={handleNextFruitUpdate} 
                            on:dangerupdate={handleDangerUpdate} 
                            on:gameover={handleGameOver} 
                            on:comboupdate={handleComboUpdate} 
                        />
                        <div class="danger-line" class:visible={isInDanger}></div>
                    </div>
                    <div class="ui-panel right">
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
                                <button class="ability-btn" on:click={handleSwap} disabled={swapsRemaining === 0}>Swap ({swapsRemaining})</button>
                                <button class="ability-btn shake" on:click={handleShake} disabled={shakesRemaining === 0}>Shake ({shakesRemaining})</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {/key}
    {:else if $gameState === 'playing_multiplayer'}
        <MultiplayerScreen
            {localPlayerName}
            {players}
            {score}
            {comboCount}
            {isInDanger}
            {nextFruit}
            {swapsRemaining}
            {shakesRemaining}
            {matchTimeRemaining}
            on:score={handleScoreUpdate}
            on:nextfruitupdate={handleNextFruitUpdate}
            on:dangerupdate={handleDangerUpdate}
            on:gameover={handleGameOver}
            on:comboupdate={handleComboUpdate}
            on:swap={handleSwap}
            on:shake={handleShake}
            on:leave={handleLeaveLobby}
            on:gameboardReady={handleGameboardReady}
        />
    {:else if $gameState === 'gameover'}
        <GameOverScreen {score} on:playagain={() => window.location.reload()} />
    {:else if $gameState === 'name_input'}
        <NameInputModal 
            title={nameInputAction === 'create' ? 'Enter Name to Create Room' : `Enter Name to Join Room ${roomCode}`}
            on:submit={handleNameSubmit}
            on:close={() => $gameState = 'multiplayer_menu'}
        />
    {:else if $gameState === 'multiplayer_results'}
        <MultiplayerResults {localPlayerName} {finalRankings} on:playagain={() => $gameState = 'lobby'} />
    {/if}

    {#if showLeaderboard}
        <Leaderboard on:close={() => showLeaderboard = false} />
    {/if}
</main>

<style>
    main { 
        padding: 0.5rem; 
        box-sizing: border-box;
        overflow-y: auto;
    }
    .game-ui-layout { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        gap: 0.5rem; 
        width: 100%;
        max-width: 1000px;
        margin: 0 auto;
    }
    .game-header { 
        display: flex; 
        gap: 0.5rem; 
        width: 100%; 
        justify-content: center;
        padding: 0.3rem 0;
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
    .game-area-grid { 
        display: flex; 
        align-items: flex-start; 
        gap: 0.5rem; 
        width: 100%; 
        max-width: 100%; 
        flex-wrap: wrap; 
        justify-content: center;
    }
    .ui-panel { 
        display: flex; 
        flex-direction: column; 
        gap: 0.3rem; 
        width: 100%; 
        max-width: 200px; 
        min-width: 150px;
    }
    .game-board-area { 
        position: relative; 
        width: 100%; 
        max-width: 400px; 
        margin: 0 auto;
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
    .box-content.high-score { 
        font-size: clamp(0.7rem, 2vw, 1rem); 
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
        filter: brightness(1.1); 
    }
    .ability-btn.shake { 
        background-color: #ff3b30; 
    }
    .ability-btn:disabled { 
        background-color: #555; 
        cursor: not-allowed; 
        opacity: 0.6; 
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
    @media (max-width: 800px) {
        .game-area-grid { 
            flex-direction: column; 
            align-items: center; 
        }
        .ui-panel { 
            max-width: 90vw; 
            min-width: 150px;
        }
        .game-board-area { 
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
    }
</style>