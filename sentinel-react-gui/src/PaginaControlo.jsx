import React, { useEffect, useRef } from 'react';
import CardKillSwitch from './CardKillSwitch';
import CardModoVoo from './CardModoVoo';
import CardMacrosPosicao from './CardMacrosPosicao';
import CardMacrosAtitude from './CardMacrosAtitude';
import CardPropulsores from './CardPropulsores';

function PaginaControlo({ ros, isActive }) {
  const topicRef = useRef(null);

  // Configuramos o tópico de envio na página pai para o Botão Reset
  useEffect(() => {
    if (!ros) return;
    topicRef.current = new window.ROSLIB.Topic({
      ros: ros,
      name: '/tasks',
      messageType: 'std_msgs/String'
    });
    topicRef.current.advertise();

    return () => {
      if (topicRef.current) topicRef.current.unadvertise();
    };
  }, [ros]);

  const handleResetOdometry = () => {
    if (topicRef.current) {
      topicRef.current.publish(new window.ROSLIB.Message({ data: '9' }));
      console.log('Sistema: RESET ODOMETRY enviado (ID: 9)');
    }
  };

  return (
    <div className="pagina-scroll">
      
      <div className="controlo-grid">
        <div className="controlo-esquerdo">
          <CardKillSwitch ros={ros} isActive={isActive} />
          <CardModoVoo ros={ros} isActive={isActive} />
        </div>

        <div className="controlo-direito">
          {ros && <CardPropulsores ros={ros} isActive={isActive} />}
        </div>
      </div>

      {/* A Nova Grelha de 3 Colunas! */}
      <div className="macros-container">
        <CardMacrosAtitude ros={ros} isActive={isActive} />
        <CardMacrosPosicao ros={ros} isActive={isActive} />
        
        {/* BOTÃO LATERAL VERTICAL */}
        <button className="reset-side-btn" onClick={handleResetOdometry}>
          <span className="reset-icon">↺</span>
          RESET<br/>ODOM
        </button>
      </div>

    </div>
  );
}

export default PaginaControlo;