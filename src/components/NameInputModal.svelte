<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    
    export let title = "Enter your name";
    let playerName = '';

    function handleSubmit() {
        if (playerName && playerName.trim()) {
            dispatch('submit', { name: playerName.trim() });
        }
    }

    function handleClose() {
        dispatch('close');
    }
</script>

<div class="screen-overlay" on:click={handleClose}>
    <form on:submit|preventDefault={handleSubmit} on:click|stopPropagation class="dialog-box">
        <h2 class="title">{title}</h2>
        <input 
            type="text" 
            bind:value={playerName} 
            placeholder="Your Name (max 15)" 
            maxlength="15" 
            class="name-input"
            autofocus
        >
        <button type="submit" class="submit-button">Confirm</button>
    </form>
</div>

<style>
    .screen-overlay { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.75); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .dialog-box { background-color: #a0522d; padding: 2rem; border-radius: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: white; width: 400px; max-width: 90%; border: 4px solid #8B4513; text-align: center; }
    .title { font-size: 1.5rem; font-weight: 600; margin-bottom: 1.5rem; }
    .name-input { width: 100%; text-align: center; font-size: 1.5rem; background: rgba(0,0,0,0.3); color: white; border: 2px solid #8B4513; border-radius: 0.5rem; padding: 0.75rem; margin-bottom: 1.5rem; }
    .name-input:focus { outline: none; border-color: #fde047; }
    .submit-button { width: 100%; background-color: #22c55e; color: white; padding: 1rem; font-size: 1.2rem; font-weight: bold; border-radius: 0.75rem; cursor: pointer; border: none; }
</style>