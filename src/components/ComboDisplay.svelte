<script>
    export let count = 0;

    let animate = false;

    $: if (count > 1) {
        animate = false;
        requestAnimationFrame(() => {
            animate = true;
        });
    }
</script>

{#if count > 1}
    <div class="combo-meter" class:animate>
        COMBO x{count}!
    </div>
{/if}

<style>
    .combo-meter {
        font-size: 1.5rem;
        font-weight: 700;
        color: #a855f7; /* Purple */
        text-shadow: 0 0 10px white;
        text-align: center;
        margin-top: 0.5rem;
    }

    @keyframes wiggle {
        0%, 100% { transform: rotate(-3deg) scale(1); }
        50% { transform: rotate(3deg) scale(1.1); }
    }
    .animate {
        animation: wiggle 0.4s ease-in-out;
    }
</style>