<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import Matter from 'matter-js';
    import { FRUITS, INITIAL_DROPPABLE_FRUIT_IDS } from '../data/fruits.js';
    import { AudioManager } from '../lib/AudioManager.js';

    export let isMultiplayer = false;

    export function swapFruits() {
        if (!isDroppingAllowed) {
            dispatch('swapBlocked');
            return;
        }
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
    
    export function stopGame() {
        if (runner) Matter.Runner.stop(runner);
        isDroppingAllowed = false;
    }

    const dispatch = createEventDispatcher();
    let GAME_WIDTH = 380;
    let GAME_HEIGHT = 550;
    const wallThickness = 20;
    const DANGER_LINE_Y = 80;
    const DROP_INDICATOR_Y = 40;
    const COMBO_TIMEOUT = 2000;
    const AFK_WARNING_TIMEOUT = 5000;
    const AFK_ELIMINATION_TIMEOUT = 10000;

    let sceneElement;
    let engine, render, runner, gameOverTimeoutId = null;
    const fruitBodies = new Set(), imageCache = new Map();
    let areImagesLoaded = false, mousePositionX = 0, isDroppingAllowed = true;
    let currentFruit = null, nextFruit = null, scorePopups = [];
    let comboCount = 0;
    let comboTimeoutId = null;
    let lastFruitDroppedTime = Date.now();
    let afkWarningShown = false;

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
        if (totalImages === 0) {
            areImagesLoaded = true;
            return;
        }
        FRUITS.forEach(fruitDef => {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                if (loadedCount === totalImages) areImagesLoaded = true;
            };
            img.onerror = () => {
                console.error(`Failed to load image for ${fruitDef.name}`);
                loadedCount++;
                if (loadedCount === totalImages) areImagesLoaded = true;
            };
            img.src = fruitDef.imageSrc;
            imageCache.set(fruitDef.id, img);
        });
    }

    function updateCanvasSize() {
        if (!sceneElement) { return; }
        const maxWidth = Math.min(window.innerWidth * 0.9, 400);
        const maxHeight = window.innerHeight * 0.65;
        const aspectRatio = 380 / 550;
        let newWidth = maxWidth;
        let newHeight = newWidth / aspectRatio;
        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = newHeight * aspectRatio;
        }
        GAME_WIDTH = Math.max(200, newWidth);
        GAME_HEIGHT = Math.max(275, newHeight);
        mousePositionX = GAME_WIDTH / 2;
        if (render && render.canvas) {
            render.canvas.width = GAME_WIDTH;
            render.canvas.height = GAME_HEIGHT;
            render.options.width = GAME_WIDTH;
            render.options.height = GAME_HEIGHT;
            Matter.Render.setPixelRatio(render, window.devicePixelRatio);
        }
    }

    function dropFruit() {
        if (!isDroppingAllowed || !areImagesLoaded || !currentFruit) { return; }
        const minX = wallThickness + currentFruit.radius;
        const maxX = GAME_WIDTH - wallThickness - currentFruit.radius;
        if (mousePositionX < minX || mousePositionX > maxX) { return; }
        
        AudioManager.play('drop');
        isDroppingAllowed = false;
        const fruitBody = Matter.Bodies.circle(mousePositionX, DROP_INDICATOR_Y + currentFruit.radius, currentFruit.radius, { restitution: 0.3, friction: 0.5, plugin: { fruitId: currentFruit.id }, render: { visible: false } });
        fruitBodies.add(fruitBody);
        Matter.World.add(engine.world, fruitBody);
        currentFruit = nextFruit;
        nextFruit = selectNewFruit();
        dispatch('nextfruitupdate', { fruit: nextFruit });
        lastFruitDroppedTime = Date.now();
        afkWarningShown = false;
        setTimeout(() => { isDroppingAllowed = true; }, 300);
    }

    function handleMouseMove(event) {
        if (!currentFruit || !sceneElement) return;
        const rect = sceneElement.getBoundingClientRect();
        let x = event.clientX - rect.left;
        const minX = wallThickness + currentFruit.radius;
        const maxX = GAME_WIDTH - wallThickness - currentFruit.radius;
        mousePositionX = Math.max(minX, Math.min(x, maxX));
    }

    function handleTouchMove(event) {
        if (!currentFruit || !sceneElement) return;
        event.preventDefault();
        const rect = sceneElement.getBoundingClientRect();
        let x = event.touches[0].clientX - rect.left;
        const minX = wallThickness + currentFruit.radius;
        const maxX = GAME_WIDTH - wallThickness - currentFruit.radius;
        mousePositionX = Math.max(minX, Math.min(x, maxX));
    }

    function checkAFK() {
        if (!isMultiplayer) return;
        const now = Date.now();
        const idleTime = now - lastFruitDroppedTime;
        if (idleTime > AFK_WARNING_TIMEOUT && !afkWarningShown) {
            afkWarningShown = true;
        }
        if (idleTime > AFK_ELIMINATION_TIMEOUT) {
            dispatch('gameover');
            stopGame();
        }
    }

    function initializePhysics() {
        if (!sceneElement) { return; }
        engine = Matter.Engine.create({ gravity: { y: 1 } });
        render = Matter.Render.create({
            element: sceneElement,
            engine: engine,
            options: { width: GAME_WIDTH, height: GAME_HEIGHT, wireframes: false, background: 'transparent' }
        });
        
        const wallOptions = { isStatic: true, render: { visible: false } };
        Matter.World.add(engine.world, [
            Matter.Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - (wallThickness / 2), GAME_WIDTH, wallThickness, wallOptions),
            Matter.Bodies.rectangle(wallThickness / 2, GAME_HEIGHT / 2, wallThickness, GAME_HEIGHT, wallOptions),
            Matter.Bodies.rectangle(GAME_WIDTH - (wallThickness / 2), GAME_HEIGHT / 2, wallThickness, GAME_HEIGHT, wallOptions),
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
            checkAFK();
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
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        const checkImages = setInterval(() => {
            if (areImagesLoaded) {
                clearInterval(checkImages);
                currentFruit = selectNewFruit();
                nextFruit = selectNewFruit();
                dispatch('nextfruitupdate', { fruit: nextFruit });
                initializePhysics();
            }
        }, 100);
        return () => {
            clearInterval(checkImages);
            window.removeEventListener('resize', updateCanvasSize);
        };
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
        <div class="loading-overlay">
            <div class="loading-text">Loading Fruits...</div>
        </div>
    {/if}
    <div 
        bind:this={sceneElement} 
        class="physics-scene-container"
        class:ready={areImagesLoaded}
        on:mousemove={handleMouseMove}
        on:click={dropFruit}
        on:touchmove|preventDefault={handleTouchMove}
        on:touchstart|preventDefault={handleTouchMove}
        on:touchend|preventDefault={dropFruit}
    >
        {#if isDroppingAllowed && areImagesLoaded && currentFruit}
            <div class="drop-indicator" style="left: {mousePositionX}px; top: {DROP_INDICATOR_Y}px;">
                <div class="drop-line" style="height: {GAME_HEIGHT - DROP_INDICATOR_Y}px;"></div>
                <img src={currentFruit.imageSrc} alt={currentFruit.name} style="width: {currentFruit.radius * 2}px;" />
            </div>
        {/if}
        {#each scorePopups as popup (popup.id)}
            <div class="score-popup" style="left: {popup.x}px; top: {popup.y}px; font-size: {Math.min(GAME_WIDTH * 0.03, 2)}rem;">
                +{popup.value}
            </div>
        {/each}
        {#if isMultiplayer && afkWarningShown}
            <div class="afk-warning">Don’t go AFK!</div>
        {/if}
    </div>
</div>

<style>
    .gameboard-wrapper { 
        position: relative; 
        width: 100%;
        max-width: 400px;
        margin: 0 auto;
    }
    .physics-scene-container {
        position: relative;
        background-color: #debe9c;
        border: 12px solid #8B4513;
        border-top: 20px solid #a0522d;
        border-bottom: 20px solid #a0522d;
        border-radius: 20px;
        box-shadow: 0px 15px 30px rgba(0, 0, 0, 0.4), inset 0px 0px 15px rgba(0, 0, 0, 0.3);
        background-image: url('https://www.transparenttextures.com/patterns/wood-pattern.png');
        overflow: visible;
        cursor: not-allowed;
        aspect-ratio: 380 / 550;
    }
    .physics-scene-container.ready { cursor: pointer; }
    .drop-indicator { 
        position: absolute; 
        transform: translateX(-50%); 
        pointer-events: none; 
        z-index: 100; 
        opacity: 0.8; 
    }
    .drop-line { 
        position: absolute; 
        left: 50%; 
        top: 0; 
        transform: translateX(-50%); 
        border-left: 2px dashed rgba(0,0,0,0.3); 
    }
    .drop-indicator img { border-radius: 50%; }
    .loading-overlay { 
        position: absolute; 
        inset: 0; 
        background-color: rgba(0,0,0,0.7); 
        z-index: 200; 
        display: flex; 
        justify-content: center; 
        align-items: center; 
        color: white; 
        font-size: 1.2rem; 
        font-weight: 600; 
        border-radius: 20px;
    }
    @keyframes float-up {
        from { transform: translate(-50%, 0) scale(1); opacity: 1; }
        to { transform: translate(-50%, -50px) scale(0.7); opacity: 0; }
    }
    .score-popup {
        position: absolute;
        color: black;
        font-weight: 700;
        text-shadow: 1px 1px 2px rgba(255,255,255,0.7);
        pointer-events: none;
        z-index: 100;
        max-width: 100px;
        max-height: 50px;
        overflow: hidden;
        animation: float-up 1.5s ease-out forwards;
    }
    .afk-warning {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 165, 0, 0.8);
        color: white;
        border-radius: 8px;
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
        font-weight: 600;
        max-width: 200px;
        text-align: center;
        z-index: 100;
    }
    @media (max-width: 400px) {
        .gameboard-wrapper { max-width: 90vw; }
        .physics-scene-container { 
            border: 8px solid #8B4513; 
            border-top: 15px solid #a0522d; 
            border-bottom: 15px solid #a0522d; 
            border-radius: 15px; 
        }
        .loading-overlay { font-size: 1rem; }
        .afk-warning { font-size: 0.8rem; padding: 0.3rem 0.8rem; max-width: 180px; }
    }
</style>