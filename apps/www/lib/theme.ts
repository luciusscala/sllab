export const THEME_KEY = "sllab-theme";

/** Runs before paint so the stored theme never flashes. */
export const themeScript = `(function(){try{var s=localStorage.getItem("${THEME_KEY}");var d=s||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=d;}catch(e){document.documentElement.dataset.theme="light";}})();`;
