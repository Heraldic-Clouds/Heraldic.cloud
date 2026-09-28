const keyRows = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export default function VirtualKeyboard({ visible, onClose, onOpen, onType, onSend }) {
  return <div className={`keyboard-dock${visible ? '' : ' keyboard-dock-closed'}`} aria-label="On-screen keyboard">
    {visible ? <div className="keyboard" role="group" aria-label="On-screen typing keyboard">
      <button type="button" className="keyboard-close" onClick={onClose} aria-label="Close keyboard">×</button>
      {keyRows.map((row, index) => <div className={`key-row row-${index + 1}`} key={row.join('')}>{row.map((key) => <button key={key} onClick={() => onType(key)} aria-label={`Type ${key}`}>{key}</button>)}</div>)}
      <div className="key-row bottom-row"><button className="utility-key" onClick={() => onType('⌫')} aria-label="Delete last character">⌫</button><button className="wide-key" onClick={() => onType('SPACE')}>SPACE</button><button className="utility-key" onClick={onSend} aria-label="Send prompt">↵</button></div>
    </div> : <button type="button" className="keyboard-reopen" onClick={onOpen}>Open keyboard</button>}
  </div>;
}
