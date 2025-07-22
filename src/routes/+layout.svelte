<style>
  :global(body) {
    font-family: 'Fredoka', sans-serif;
    
    /* --- NEW GRADIENT BACKGROUND --- */
    /* A soft, radial gradient that's dark on the edges and lighter in the middle */
    background-color: #2a2a3e; /* A dark blue-purple fallback color */
    background-image: radial-gradient(circle, #4a4a68 0%, #2a2a3e 100%);

    margin: 0;
    overflow: hidden; /* Prevent scrolling */
    overscroll-behavior: none; /* Prevent pull-to-refresh on mobile */
  }

  /* We still need to import the Google Font */
  @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;700&display=swap');
</style>

<!-- This slot will render our page content -->
<slot />