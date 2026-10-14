import { DeskScene } from './components/DeskScene';
import './App.css';

function App() {
  return (
    <div className="app">
      <div className="ui-overlay">
        <h1>Metal Office Desk</h1>
        <p>Click any drawer to open/close. Drag to orbit. Scroll to zoom.</p>
        <p className="shortcuts">Keys: <kbd>1</kbd>-<kbd>6</kbd> individual drawers · <kbd>Space</kbd> all drawers</p>
      </div>
      <DeskScene />
    </div>
  );
}

export default App;