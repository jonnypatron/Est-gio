import React from 'react';
import CardKillSwitch from './CardKillSwitch';
import CardModoVoo from './CardModoVoo';
import CardMacrosPosicao from './CardMacrosPosicao';
import CardMacrosAtitude from './CardMacrosAtitude';

function PaginaControlo({ ros }) {
  return (
    <div className="pagina-scroll">
      <div className="controlo-grid">
        
        <div className="kill-switch-container">
          <CardKillSwitch ros={ros} />
        </div>

        <CardModoVoo ros={ros} />

        <div className="macros-container">
          <CardMacrosAtitude ros={ros} />
          <CardMacrosPosicao ros={ros} />
        </div>

      </div>
    </div>
  );
}

export default PaginaControlo;