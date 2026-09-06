export function ThemeScript() {
  const script = `
    (function () {
      try {
        var theme = localStorage.getItem('auro-theme');
        if (theme !== 'light') {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
