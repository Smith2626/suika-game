<script>
  import MenuScreen from '../components/MenuScreen.svelte';
  import GameOverScreen from '../components/GameOverScreen.svelte';
  import Leaderboard from '../components/Leaderboard.svelte';
  import MultiplayerMenu from '../components/MultiplayerMenu.svelte';
  import LobbyRoom from '../components/LobbyRoom.svelte';
  import NameInputModal from '../components/NameInputModal.svelte';
  import MultiplayerResults from '../components/MultiplayerResults.svelte';
  import SinglePlayerScreen from '../components/SinglePlayerScreen.svelte';
  import MultiplayerScreen from '../components/MultiplayerScreen.svelte';
  import { onMount } from 'svelte';
  import { AudioManager } from '../lib/AudioManager.js';
  import { gameState } from '../lib/gameStore.js';
  import { supabase } from '../lib/supabaseClient.js';
  
  let score=0, highScore=0, nextFruit=null, isInDanger=false, swapsRemaining=2, shakesRemaining=1;
  let gameboardComponent, showLeaderboard=false, comboCount=0;
  let nameInputAction=null, roomCode='', isHost=false, localPlayerName='', gameChannel=null;
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
      }
      if (value !== 'lobby' && value !== 'playing_multiplayer' && value !== 'multiplayer_results' && gameChannel) {
          supabase.removeChannel(gameChannel);
          gameChannel = null; players = [];
          if (matchTimerInterval) cancelAnimationFrame(matchTimerInterval);
      }
  });

  function handleScoreUpdate(e) {
      score += e.detail.points;
      if (score > highScore) { highScore = score; localStorage.setItem(HIGH_SCORE_KEY, highScore); }
      if ($gameState === 'playing_multiplayer' && gameChannel) {
        gameChannel.send({ type: 'broadcast', event: 'SCORE_UPDATE', payload: { name: localPlayerName, score: score } });
      }
  }
  function handleComboUpdate(e) { comboCount = e.detail.count; }
  function handleNextFruitUpdate(e) { nextFruit = e.detail.fruit; }
  function handleDangerUpdate(e) { isInDanger = e.detail.status; }
  function handleGameOver() {
      AudioManager.play('gameover');
      if ($gameState === 'playing_multiplayer' && gameChannel) {
          if (gameboardComponent) gameboardComponent.stopGame();
          gameChannel.send({ type: 'broadcast', event: 'PLAYER_LOST', payload: { name: localPlayerName, finalScore: score } });
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
      roomCode = code; nameInputAction = 'join'; $gameState = 'name_input';
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
        players = Object.keys(presenceState).map(key => ({
            name: key,
            isHost: presenceState[key][0].isHost,
            score: players.find(p => p.name === key)?.score || 0,
            isEliminated: players.find(p => p.name === key)?.isEliminated || false
        }));
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
        if (!activePlayers.has(payload.name)) return;
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
        finalRankings = eliminatedPlayers.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const pA = players.find(p => p.name === a.name);
            const pB = players.find(p => p.name === b.name);
            return (pB?.isHost ? 1 : 0) - (pA?.isHost ? 1 : 0);
        }).map((p, i) => ({ ...p, rank: i + 1 }));
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
    gameChannel.subscribe(async (status) => { if (status === 'SUBSCRIBED') await gameChannel.track({ isHost }); });
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
    <SinglePlayerScreen 
      {score} {highScore} {nextFruit} {isInDanger} {swapsRemaining} {shakesRemaining} {comboCount}
      bind:gameboardComponent
      on:swap={handleSwap} on:shake={handleShake}
      on:newgame={() => $gameState = 'menu'}
      on:showleaderboard={handleShowLeaderboard}
      on:score={handleScoreUpdate} on:nextfruitupdate={handleNextFruitUpdate}
      on:dangerupdate={handleDangerUpdate} on:gameover={handleGameOver} on:comboupdate={handleComboUpdate}
    />
  {:else if $gameState === 'playing_multiplayer'}
    <MultiplayerScreen
        {localPlayerName} {players} {score} {comboCount} {isInDanger} {nextFruit}
        {swapsRemaining} {shakesRemaining} {matchTimeRemaining}
        bind:this={gameboardComponent}
        on:score={handleScoreUpdate} on:nextfruitupdate={handleNextFruitUpdate}
        on:dangerupdate={handleDangerUpdate} on:gameover={handleGameOver}
        on:comboupdate={handleComboUpdate} on:swap={handleSwap} on:shake={handleShake}
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
  main {
    width: 100vw;
    height: 100vh;
  }
</style>