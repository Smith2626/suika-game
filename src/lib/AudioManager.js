import { Howl } from 'howler';

// This is a simple object that will manage all our game's audio.
export const AudioManager = {
    sounds: {},
    isMuted: false,

    // The 'load' function creates new Howl instances for each sound.
    // We provide the path to the sound files in the `static` folder.
    load: function() {
        this.sounds.drop = new Howl({ 
            src: ['/drop.mp3'], 
            volume: 0.6 
        });
        this.sounds.merge = new Howl({ 
            src: ['/merge.mp3'], 
            volume: 0.5 
        });
        this.sounds.gameOver = new Howl({ 
            src: ['/gameover.mp3'], 
            volume: 0.8 
        });
        this.sounds.click = new Howl({ 
            src: ['/click.mp3'], 
            volume: 0.9 
        });
        this.sounds.victory = new Howl({ 
        src: ['/victory.mp3'], 
        volume: 0.8 
        });
    },

    // The 'play' function will play a sound by name if the game is not muted.
    play: function(soundName) {
        if (!this.isMuted && this.sounds[soundName]) {
            this.sounds[soundName].play();
        }
    },

    // A function to toggle the mute state.
    toggleMute: function() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
};

// We call the load function immediately so the sounds are ready when this file is imported.
AudioManager.load();