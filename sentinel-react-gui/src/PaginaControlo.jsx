import React from 'react';
import CardKillSwitch from './CardKillSwitch';
import CardModoVoo from './CardModoVoo';
import CardMacrosPosicao from './CardMacrosPosicao';
import CardMacrosAtitude from './CardMacrosAtitude';
import CardPropulsores from './CardPropulsores';

function PaginaControlo({ ros, isActive }) {
  return (
    <div className="pagina-scroll" style={{ padding: '20px' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <CardKillSwitch ros={ros} isActive={isActive} />
          <CardModoVoo ros={ros} isActive={isActive} />
        </div>

        <div style={{ height: '100%' }}>
          {ros && <CardPropulsores ros={ros} isActive={isActive} />}
        </div>
        
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <CardMacrosAtitude ros={ros} isActive={isActive} />
        <CardMacrosPosicao ros={ros} isActive={isActive} />
      </div>

    </div>
  );
}

export default PaginaControlo;