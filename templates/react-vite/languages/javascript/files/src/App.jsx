import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">React + Vite + JavaScript</p>
        <h1>{'{{projectName}}'}</h1>
        <p className="intro">
          Your project is ready. Edit <code>src/App.jsx</code> to get started.
        </p>
        <button type="button" onClick={() => setCount((value) => value + 1)}>
          Count is {count}
        </button>
      </section>
    </main>
  );
}

export default App;
