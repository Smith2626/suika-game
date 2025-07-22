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
  let gameboardComponent, showLeaderboard=false, comboCount=0, gameId=0;
  let showNameInput=false, nameInputAction=null, roomCode='', isHost=false, localPlayerName='', gameChannel=null;
  let players = []; // Use an array for players
  let finalRankings = [];
  const MATCH_DURATION_SECONDS = 3;
  let matchTimeRemaining = MATCH_DURATION_SECONDS;
  let matchTimerInterval = null;

  const HIGH_SCORE_KEY = 'suikaGameHighScore';

  onMount(() => {
      highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
  });

  gameState.subscribe(value => {
      // Universal reset logic for starting any game
      if (value === 'playing' || value === 'playing_multiplayer') {
          score=0; swapsRemaining=2; shakesRemaining=1; nextFruit=null; isInDanger=false; comboCount=0;
          gameId++;
      }
      // Universal cleanup for leaving multiplayer
      if (value !== 'lobby' && value !== 'playing_multiplayer' && value !== 'multiplayer_results' && gameChannel) {
          supabase.removeChannel(gameChannel);
          gameChannel = null; players = [];
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
          if (gameboardComponent) { gameboardComponent.stopGame(); }
          gameChannel.send({
              type: 'broadcast', event: 'PLAYER_LOST', payload: { name: localPlayerName, finalScore: score }
          });
      } else {
          $gameState = 'gameover';
      }
  }

  function handleSwap() { if (swapsRemaining > 0 && gameboardComponent) { swapsRemaining--; gameboardComponent.swapFruits(); } }
  function handleShake() { if (shakesRemaining > 0 && gameboardComponent) { shakesRemaining--; gameboardComponent.shakeWorld(); } }
  function handleShowLeaderboard() { AudioManager.play('click'); showLeaderboard = true; }
  
  function createRoom() { nameInputAction = 'create'; $gameState = 'name_input'; }
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
        // Correctly build the players array
        players = Object.keys(presenceState).map(key => {
            const existingPlayer = players.find(p => p.name === key);
            return {
                name: key,
                isHost: presenceState[key][0].isHost,
                score: existingPlayer?.score || 0,
                isEliminated: existingPlayer?.isEliminated || false
            };
        });
    });

    gameChannel.on('broadcast', { event: 'GAME_START' }, ({ payload }) => {
        activePlayers = new Set(players.map(p => p.name));
        eliminatedPlayers = [];
        startMatchTimer(payload.startTime);
        $gameState = 'playing_multiplayer';
    });
    
    gameChannel.on('broadcast', { event: 'SCORE_UPDATE' }, ({ payload }) => {
        const playerToUpdate = players.find(p => p.name === payload.name);
        if (playerToUpdate) { playerToUpdate.score = payload.score; players = players; }
    });

    gameChannel.on('broadcast', { event: 'PLAYER_LOST' }, ({ payload }) => {
        if (!activePlayers.has(payload.name)) return; // Prevent duplicates
        activePlayers.delete(payload.name);
        eliminatedPlayers.push({ name: payload.name, score: payload.finalScore });
        const playerToUpdate = players.find(p => p.name === payload.name);
        if(playerToUpdate) { playerToUpdate.isEliminated = true; players = players; }
        if (activePlayers.size <= 1) { endMatch(activePlayers); }
    });

    function endMatch(survivors) {
        if (matchTimerInterval) cancelAnimationFrame(matchTimerInterval);
        survivors.forEach(winnerName => {
            const winner = players.find(p => p.name === winnerName);
            const winnerScore = winnerName === localPlayerName ? score : winner?.score || 0;
            eliminatedPlayers.push({ name: winnerName, score: winnerScore });
        });
        finalRankings = eliminatedPlayers
            .sort((a, b) => b.score - a.score)
            .map((p, i) => ({ ...p, rank: i + 1 }));
        $gameState = 'multiplayer_results';
    }
    
    function startMatchTimer(startTime) {
        if (matchTimerInterval) cancelAnimationFrame(matchTimerInterval);
        function updateTimer() {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const newTimeRemaining = MATCH_DURATION_SECONDS - elapsed;
            if (newTimeRemaining !== matchTimeRemaining) matchTimeRemaining = newTimeRemaining;
            if (matchTimeRemaining > 0) {
                matchTimerInterval = requestAnimationFrame(updateTimer);
            } else {
                matchTimeRemaining = 0;
                if (isHost && $gameState === 'playing_multiplayer') {
                    gameChannel.send({ type: 'broadcast', event: 'TIME_UP' });
                }
            }
        }
        matchTimerInterval = requestAnimationFrame(updateTimer);
    }
    gameChannel.on('broadcast', { event: 'TIME_UP' }, () => { endMatch(activePlayers); });
    
    gameChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await gameChannel.track({ isHost });
    });
  }

  async function handleStartMultiplayerGame() {
    if (!isHost || !gameChannel) return;
    AudioManager.play('click');
    await gameChannel.send({ type: 'broadcast', event: 'GAME_START', payload: { startTime: Date.now() } });
  }
  
  function handleLeaveLobby() {
    AudioManager.play('click');
    $gameState = 'multiplayer_menu';
  }
</script>

<main>
  {#if $gameState === 'menu'}
    <MenuScreen />
  {:else if $gameState === 'multiplayer_menu'}
    <MultiplayerMenu on:create={createRoom} on:join={joinRoom} />
  {:else if $gameState === 'lobby'}
    <LobbyRoom {roomCode} {players} {localPlayerName} on:leave={handleLeaveLobby} on:startgame={handleStartMultiplayerGame} />
  {:else if $gameState === 'playing'}
    {#key gameId}
        <div class="game-ui-layout">
            <header class="game-header">
                <button on:click={() => window.location.reload()} class="header-btn">New Game</button>
                <button on:click={handleShowLeaderboard} class="header-btn">Leaderboard</button>
            </header>
            <div class="game-area-grid">
                <div class="ui-panel left">
                    <div class="ui-box">
                        <div class="box-title">SCORE</div><div class="box-content score">{score}</div><ComboDisplay count={comboCount} />
                    </div>
                    <div class="ui-box">
                        <div class="box-title">HIGH SCORE</div><div class="box-content high-score">{highScore}</div>
                    </div>
                </div>
                <div class="game-board-area">
                    <Gameboard bind:this={gameboardComponent} on:score={handleScoreUpdate} on:nextfruitupdate={handleNextFruitUpdate} on:dangerupdate={handleDangerUpdate} on:gameover={handleGameOver} on:comboupdate={handleComboUpdate} />
                    <div class="danger-line" class:visible={isInDanger}></div>
                </div>
                <div class="ui-panel right">
                    <div class="ui-box">
                        <div class="box-title">NEXT</div>
                        <div class="box-content next-fruit">
                            {#if nextFruit}<img src={nextFruit.imageSrc} alt={nextFruit.name} style="width:{nextFruit.radius * 1.5}px; border-radius: 50%;">{:else}<div class="fruit-placeholder"></div>{/if}
                        </div>
                    </div>
                    <div class="ui-box evolution-box">
                        <div class="box-title">FRUIT EVOLUTION</div>
                        <div class="evolution-path">
                            {#each FRUITS as fruit, i}<img src={fruit.imageSrc} alt={fruit.name} class="fruit-evo-img" title={fruit.name}>{#if i < FRUITS.length - 1}<div class="arrow">→</div>{/if}{/each}
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
        bind:this={gameboardComponent}
        on:score={handleScoreUpdate}
        on:nextfruitupdate={handleNextFruitUpdate}
        on:dangerupdate={handleDangerUpdate}
        on:gameover={handleGameOver}
        on:comboupdate={handleComboUpdate}
        on:swap={handleSwap}
        on:shake={handleShake}
        on:leave={handleLeaveLobby}
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
  /* --- MOBILE FIRST STYLES (The Default) --- */
  main { display: flex; justify-content: center; align-items: center; width: 100vw; height: 100vh; padding: 0.5rem; box-sizing: border-box; }
  .game-ui-layout { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 100%; }
  .game-header { display: flex; gap: 1rem; }
  .header-btn { background: #a0522d; color: white; border: 2px solid #633b1d; padding: 0.5rem 1rem; border-radius: 0.5rem; font-family: inherit; font-weight: 600; cursor: pointer; }
  
  /* On mobile, we stack everything vertically */
  .game-area-grid { display: flex; flex-direction: column; align-items: center; gap: 1rem; width: 100%; }
  .ui-panel { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: center; gap: 0.5rem; }
  .ui-panel.left { order: 2; } /* Score below game */
  .ui-panel.right { order: 3; } /* Other controls below score */
  .game-board-area { position: relative; order: 1; } /* Game board on top */
  
  .ui-box { background-color: #a0522d; color: white; border-radius: 1rem; padding: 0.5rem; text-align: center; border: 4px solid #8B4513; flex-grow: 1; width: calc(50% - 1rem); }
  .box-title { font-size: 0.8rem; font-weight: 500; color: #ffd700; margin-bottom: 0.25rem; }
  .box-content.score, .box-content.high-score { font-size: 1.5rem; font-weight: 700; }
  .next-fruit { height: 60px; display:flex; justify-content:center; align-items:center; }
  .evolution-box { width: 100%; }
  .evolution-path { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 2px; }
  .fruit-evo-img { width: 20px; height: 20px; border-radius: 50%; }
  .arrow { color: #ffd700; font-size: 0.8rem; }
  .abilities { display: flex; justify-content: space-around; gap: 0.5rem; }
  .ability-btn { padding: 0.5rem; font-size: 0.8rem; }
  .danger-line { position: absolute; top: 100px; left: 32px; right: 32px; height: 3px; background: #ff3b30; box-shadow: 0 0 10px #ff3b30; z-index: 10; border-radius: 3px; opacity: 0; transition: opacity 0.3s; }
  .danger-line.visible { opacity: 0.8; }

  /* --- TABLET STYLES --- */
  @media (min-width: 768px) {
    .game-area-grid {
      display: grid;
      grid-template-columns: 200px auto; /* Left panel and a main area */
      grid-template-areas: "left game" "right right";
      gap: 1.5rem;
      align-items: flex-start;
    }
    .ui-panel.left { grid-area: left; flex-direction: column; }
    .ui-panel.right { grid-area: right; flex-direction: row; }
    .game-board-area { grid-area: game; }
    .ui-box { width: 200px; }
  }

  /* --- DESKTOP STYLES --- */
  @media (min-width: 1024px) {
    .game-area-grid {
      grid-template-columns: 200px auto 200px; /* Three-column layout */
      grid-template-areas: "left game right";
      gap: 2rem;
    }
    .ui-panel.right {
      flex-direction: column;
    }
  }
</style>