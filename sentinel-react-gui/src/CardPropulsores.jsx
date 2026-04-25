import { useState, useEffect, useRef } from 'react';


function CardPropulsores({ ros, isActive }) {
  const [thrusters, setThrusters] = useState(new Array(8).fill(0));

  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!ros) return;

    const topico = new window.ROSLIB.Topic({
      ros: ros,
      name: '/thrusters/u',
      messageType: 'std_msgs/msg/Int32MultiArray',
      throttle_rate: 150
    });

    topico.subscribe((msg) => {
      if (!isActiveRef.current) return;
      // Se não houver mensagem, não houver dados, ou a lista tiver menos de 8 motores, ignora!
      if (!msg || !msg.data || msg.data.length < 8) {
        return; 
      }
      
      setThrusters(msg.data);
    });

    return () => topico.unsubscribe();
  }, [ros]);

  const renderManifold = (titulo, indices) => (
    <div className="manifold-container">
      <h3 className="manifold-title">{titulo}</h3>
      <div className="manifold-circle">
        <div className="forward-mark">FRONT</div>

        <ThrusterNozzle active={thrusters[indices[0]]} position="fr" label={`T${indices[0]}`} />
        <ThrusterNozzle active={thrusters[indices[1]]} position="rr" label={`T${indices[1]}`} />
        <ThrusterNozzle active={thrusters[indices[2]]} position="rl" label={`T${indices[2]}`} />
        <ThrusterNozzle active={thrusters[indices[3]]} position="fl" label={`T${indices[3]}`} />
      </div>
    </div>
  );

  return (
    <div className="card rcs-card">
      <h2>THRUSTERS</h2>
      <div className="manifolds-wrapper-vertical">
        {renderManifold("TOP", [4, 5, 6, 7])}
        {renderManifold("BOTTOM", [0, 1, 2, 3])}
      </div>
    </div>
  );
}

function ThrusterNozzle({ active, position, label }) {
  return (
    <div className={`thruster-nozzle pos-${position} ${active ? 'firing' : ''}`}>
      <span className="thruster-label">{label}</span>
      <div className="gas-plume"></div> 
    </div>
  );
}

export default CardPropulsores;