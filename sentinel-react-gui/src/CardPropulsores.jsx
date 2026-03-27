import { useState, useEffect } from 'react';
import * as ROSLIB from 'roslib';

function CardPropulsores({ ros }) {
  const [thrusters, setThrusters] = useState(new Array(8).fill(0));

  useEffect(() => {
    if (!ros) return;

    const topico = new ROSLIB.Topic({
      ros: ros,
      name: '/propulsores_array',
      messageType: 'std_msgs/Int32MultiArray'
    });

    topico.subscribe((msg) => setThrusters(msg.data));

    return () => topico.unsubscribe();
  }, [ros]);

  const renderManifold = (titulo, indices) => (
    <div className="manifold-container">
      <h3 className="manifold-title">{titulo}</h3>
      <div className="manifold-circle">
        <div className="forward-mark">FRENTE</div>

        <ThrusterNozzle active={thrusters[indices[0]]} position="fr" label={`T${indices[0]}`} />
        <ThrusterNozzle active={thrusters[indices[1]]} position="rr" label={`T${indices[1]}`} />
        <ThrusterNozzle active={thrusters[indices[2]]} position="rl" label={`T${indices[2]}`} />
        <ThrusterNozzle active={thrusters[indices[3]]} position="fl" label={`T${indices[3]}`} />
      </div>
    </div>
  );

  return (
    <div className="card rcs-card">
      <h2>PROPULSORES</h2>
      <div className="manifolds-wrapper-vertical">
        {renderManifold("CIMA", [4, 5, 6, 7])}
        {renderManifold("BAIXO", [0, 1, 2, 3])}
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