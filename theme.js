// Tema: svetla i tamna paleta

const themes = {
  light: {
    "--bg": "#DDFFE7",
    "--panel": "#98D7C2",
    "--border": "#167D7F",
    "--text": "#075a5b",
    "--score-bg": "#167D7F",
    "--score-text": "white",
  },
  dark: {
    "--bg": "#1a1a1a",
    "--panel": "#333",
    "--border": "#888",
    "--text": "#f1f1f1",
    "--score-bg": "#444",
    "--score-text": "#f1f1f1",
  },
};

function applyTheme(theme) {
  if (theme) {
    for (const [key, value] of Object.entries(theme)) {
      document.documentElement.style.setProperty(key, value);
    }
  }
}
