<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import Matter from 'matter-js';
    import { FRUITS, INITIAL_DROPPABLE_FRUIT_IDS } from '../data/fruits.js';
    import { AudioManager } from '../lib/AudioManager.js';

    export function swapFruits() {
        if (!isDroppingAllowed) return;
        AudioManager.play('click');
        [currentFruit, nextFruit] = [nextFruit, currentFruit];
        dispatch('nextfruitupdate', { fruit: nextFruit });
    }

    export function shakeWorld() {
        AudioManager.play('click');
        fruitBodies.forEach(body => {
            Matter.Body.applyForce(body, body.position, {
                x: (Math.random() - 0.5) * 0.05,
                y: (Math.random() - 0.5) * 0.05
            });
        });
    }
    
    // This function is for the multiplayer game over logic.
    export function stopGame() {
        if (runner) Matter.Runner.stop(runner);
        isDroppingAllowed = false;
    }

    const dispatch = createEventDispatcher();
    const GAME_WIDTH = 380;
    const GAME_HEIGHT = 550;
    const WALL_THICKNESS = 40;
    const DANGER_LINE_Y = 80;
    const DROP_INDICATOR_Y = 40;
    const COMBO_TIMEOUT = 2000;

    let sceneElement;
    let engine, render, runner, gameOverTimeoutId = null;
    const fruitBodies = new Set(), imageCache = new Map();
    let areImagesLoaded = false, mousePositionX = GAME_WIDTH / 2, isDroppingAllowed = true;
    let currentFruit = null, nextFruit = null, scorePopups = [];
    let comboCount = 0;
    let comboTimeoutId = null;

    function getFruit(fruitId) {
        return FRUITS.find(f => f.id === fruitId);
    }

    function selectNewFruit() {
        const randomId = INITIAL_DROPPABLE_FRUIT_IDS[Math.floor(Math.random() * INITIAL_DROPPABLE_FRUIT_IDS.length)];
        return getFruit(randomId);
    }

    function preloadImages() {
        let loadedCount = 0;
        const totalImages = FRUITS.length;
        if (totalImages === 0) { areImagesLoaded = true; return; }
        FRUITS.forEach(fruitDef => {
            const img = new Image();
            img.onload = () => { loadedCount++; if (loadedCount === totalImages) areImagesLoaded = true; };
            img.onerror = () => { console.error(`Failed to load image for ${fruitDef.name}`); loadedCount++; if (loadedCount === totalImages) areImagesLoaded = true; };
            img.src = fruitDef.imageSrc;
            imageCache.set(fruitDef.id, img);
        });
    }

    function dropFruit() {
        if (!isDroppingAllowed || !areImagesLoaded || !currentFruit) return;
        AudioManager.play('drop');
        isDroppingAllowed = false;
        const fruitBody = Matter.Bodies.circle(mousePositionX, DROP_INDICATOR_Y + currentFruit.radius, currentFruit.radius, { restitution: 0.3, friction: 0.5, plugin: { fruitId: currentFruit.id }, render: { visible: false } });
        fruitBodies.add(fruitBody);
        Matter.World.add(engine.world, fruitBody);
        currentFruit = nextFruit;
        nextFruit = selectNewFruit();
        dispatch('nextfruitupdate', { fruit: nextFruit });
        setTimeout(() => { isDroppingAllowed = true; }, 500);
    }

    function handleMouseMove(event) {
        if (!currentFruit || !sceneElement) return;
        const rect = sceneElement.getBoundingClientRect();
        let x = event.clientX - rect.left;
        const minX = WALL_THICKNESS / 2 + currentFruit.radius;
        const maxX = GAME_WIDTH - WALL_THICKNESS / 2 - currentFruit.radius;
        mousePositionX = Math.max(minX, Math.min(x, maxX));
    }

    function initializePhysics() {
        // THIS IS THE FIX. We MUST use Matter.Render, Matter.Engine, etc.
        // The old de-structuring `const { Render } = Matter` was the source of the crash.
        engine = Matter.Engine.create({ gravity: { y: 1 } });
        render = Matter.Render.create({ element: sceneElement, engine: engine, options: { width: GAME_WIDTH, height: GAME_HEIGHT, wireframes: false, background: 'transparent' } });
        const wallOptions = { isStatic: true, render: { visible: false } };
        
        Matter.World.add(engine.world, [
            Matter.Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT, GAME_WIDTH, WALL_THICKNESS, wallOptions),
            Matter.Bodies.rectangle(0, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, wallOptions),
            Matter.Bodies.rectangle(GAME_WIDTH, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, wallOptions),
            Matter.Bodies.rectangle(GAME_WIDTH / 2, DANGER_LINE_Y, GAME_WIDTH, 2, { isStatic: true, isSensor: true, label: 'danger-line', render: { visible: false } })
        ]);

        runner = Matter.Runner.create();
        Matter.Runner.run(runner, engine);
        
        Matter.Events.on(engine, 'afterUpdate', () => {
            let isInDanger = false;
            for (const body of fruitBodies) {
                if (body.position.y - body.circleRadius < DANGER_LINE_Y && Math.abs(body.velocity.y) < 0.1) {
                    isInDanger = true;
                    break;
                }
            }
            dispatch('dangerupdate', { status: isInDanger });
            if (isInDanger && gameOverTimeoutId === null) {
                gameOverTimeoutId = setTimeout(() => {
                    let stillInDanger = false;
                    for (const body of fruitBodies) {
                        if (body.position.y - body.circleRadius < DANGER_LINE_Y && Math.abs(body.velocity.y) < 0.1) {
                            stillInDanger = true;
                            break;
                        }
                    }
                    if (stillInDanger) {
                        Matter.Runner.stop(runner);
                        isDroppingAllowed = false;
                        dispatch('gameover');
                    }
                    gameOverTimeoutId = null;
                }, 1500);
            } else if (!isInDanger && gameOverTimeoutId !== null) {
                clearTimeout(gameOverTimeoutId);
                gameOverTimeoutId = null;
            }
        });

        Matter.Events.on(render, 'afterRender', (event) => {
            const context = render.context;
            fruitBodies.forEach(body => {
                const fruitDef = getFruit(body.plugin.fruitId);
                const fruitImage = imageCache.get(body.plugin.fruitId);
                if (fruitDef && fruitImage) {
                    context.save();
                    context.translate(body.position.x, body.position.y);
                    context.rotate(body.angle);
                    context.beginPath();
                    context.arc(0, 0, fruitDef.radius, 0, 2 * Math.PI);
                    context.clip();
                    context.drawImage(fruitImage, -fruitDef.radius, -fruitDef.radius, fruitDef.radius * 2, fruitDef.radius * 2);
                    context.restore();
                }
            });
        });
        
        Matter.Events.on(engine, 'collisionStart', (event) => {
            for (const pair of event.pairs) {
                const { bodyA, bodyB } = pair;
                if (bodyA.plugin?.fruitId !== undefined && bodyA.plugin.fruitId === bodyB.plugin.fruitId) {
                    if (!fruitBodies.has(bodyA) || !fruitBodies.has(bodyB)) continue;
                    const currentFruitDef = getFruit(bodyA.plugin.fruitId);
                    if (currentFruitDef && currentFruitDef.nextFruitId !== undefined) {
                        Matter.World.remove(engine.world, [bodyA, bodyB]);
                        fruitBodies.delete(bodyA);
                        fruitBodies.delete(bodyB);
                        const nextFruitDef = getFruit(currentFruitDef.nextFruitId);
                        if (nextFruitDef) {
                            clearTimeout(comboTimeoutId);
                            comboCount++;
                            const comboMultiplier = 1 + (comboCount - 1) * 0.1;
                            const scoreToAdd = Math.round(nextFruitDef.score * comboMultiplier);
                            dispatch('score', { points: scoreToAdd });
                            dispatch('comboupdate', { count: comboCount });
                            AudioManager.play('merge');
                            
                            comboTimeoutId = setTimeout(() => {
                                comboCount = 0;
                                dispatch('comboupdate', { count: 0 });
                            }, COMBO_TIMEOUT);

                            const mergePosition = { x: (bodyA.position.x + bodyB.position.x) / 2, y: (bodyA.position.y + bodyB.position.y) / 2 };
                            const newFruit = Matter.Bodies.circle(mergePosition.x, mergePosition.y, nextFruitDef.radius, { restitution: 0.4, friction: 0.5, render: { visible: false }, plugin: { fruitId: nextFruitDef.id } });
                            fruitBodies.add(newFruit);
                            Matter.World.add(engine.world, newFruit);

                            const popupId = Date.now() + Math.random();
                            const newPopup = { id: popupId, value: scoreToAdd, x: mergePosition.x, y: mergePosition.y };
                            scorePopups = [...scorePopups, newPopup];
                            setTimeout(() => {
                                scorePopups = scorePopups.filter(p => p.id !== popupId);
                            }, 1500);
                        }
                    }
                }
            }
        });
        Matter.Render.run(render);
    }
    
    onMount(() => {
        preloadImages();
        const checkImages = setInterval(() => {
            if (areImagesLoaded) {
                clearInterval(checkImages);
                currentFruit = selectNewFruit();
                nextFruit = selectNewFruit();
                dispatch('nextfruitupdate', { fruit: nextFruit });
                initializePhysics();
            }
        }, 100);
    });

    onDestroy(() => {
        clearTimeout(comboTimeoutId);
        if (gameOverTimeoutId) clearTimeout(gameOverTimeoutId);
        if (render) Matter.Render.stop(render);
        if (runner) Matter.Runner.stop(runner);
        if (engine) Matter.Engine.clear(engine);
    });
</script>

<div class="gameboard-wrapper">
    {#if !areImagesLoaded}
        <div class="loading-overlay"><div class="loading-text">Loading Fruits...</div></div>
    {/if}
    <div 
      bind:this={sceneElement} 
      class="physics-scene-container"
      class:ready={areImagesLoaded}
      on:mousemove={handleMouseMove}
      on:click={dropFruit}
    >
        {#if isDroppingAllowed && areImagesLoaded && currentFruit}
            <div class="drop-indicator" style="left: {mousePositionX}px; top: {DROP_INDICATOR_Y}px;">
                <div class="drop-line" style="height: {GAME_HEIGHT - DROP_INDICATOR_Y}px;"></div>
                <img src={currentFruit.imageSrc} alt={currentFruit.name} style="width: {currentFruit.radius * 2}px;"/>
            </div>
        {/if}
        
        {#each scorePopups as popup (popup.id)}
            <div class="score-popup" style="left: {popup.x}px; top: {popup.y}px;">
                +{popup.value}
            </div>
        {/each}
    </div>
</div>

<style>
    .gameboard-wrapper { perspective: 1000px; position: relative; }
    .physics-scene-container {
        transform: rotateX(2deg); 
        background-color: #debe9c;
        border: 12px solid #8B4513;
        border-top: 20px solid #a0522d;
        border-bottom: 20px solid #a0522d;
        border-radius: 20px;
        box-shadow: 0px 15px 30px rgba(0, 0, 0, 0.4), inset 0px 0px 15px rgba(0, 0,0, 0.3);
        background-image: url('https://www.transparenttextures.com/patterns/wood-pattern.png');
        position: relative;
        overflow: hidden;
        cursor: not-allowed;
    }
    .physics-scene-container.ready { cursor: pointer; }
    .drop-indicator { position: absolute; transform: translateX(-50%); pointer-events: none; z-index: 100; opacity: 0.8; }
    .drop-line { position: absolute; left: 50%; top: 0; transform: translateX(-50%); border-left: 2px dashed rgba(0,0,0,0.3); }
    .drop-indicator img { border-radius: 50%; }
    .loading-overlay { position: absolute; inset: 0; background-color: rgba(0,0,0,0.7); z-index: 200; display: flex; justify-content: center; align-items: center; color: white; font-size: 1.5rem; font-weight: 600; border-radius: 20px; }

    @keyframes float-up {
        from { transform: translate(-50%, 0) scale(1); opacity: 1; }
        to { transform: translate(-50%, -50px) scale(0.8); opacity: 0; }
    }
    .score-popup {
        position: absolute;
        color: black;
        font-size: 1.8rem;
        font-weight: 700;
        text-shadow: 1px 1px 2px rgba(255,255,255,0.7);
        pointer-events: none;
        z-index: 100;
        animation: float-up 1.5s ease-out forwards;
    }
</style>