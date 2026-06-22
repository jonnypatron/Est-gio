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

  // Cada anel é visto com a FRENTE para cima:
  //   fr = Front-Right (canto sup. direito)   fl = Front-Left  (canto sup. esquerdo)
  //   rr = Rear-Right  (canto inf. direito)   rl = Rear-Left   (canto inf. esquerdo)

  //   TOP:    TFR=1  TBR=2  TBL=0  TFL=3
  //   BOTTOM: BFR=4  BBR=5  BBL=6  BFL=7
  const TOP_MAP    = { fr: 0, rr: 1, rl: 2, fl: 3 };
  const BOTTOM_MAP = { fr: 4, rr: 5, rl: 6, fl: 7 };

  const renderManifold = (titulo, map) => (
    <div className="manifold-container">
      <h3 className="manifold-title">{titulo}</h3>
      <div className="manifold-circle">
        <div className="forward-mark">FRONT</div>

        <ThrusterNozzle active={thrusters[map.fr]} position="fr" label={`T${map.fr}`} />
        <ThrusterNozzle active={thrusters[map.rr]} position="rr" label={`T${map.rr}`} />
        <ThrusterNozzle active={thrusters[map.rl]} position="rl" label={`T${map.rl}`} />
        <ThrusterNozzle active={thrusters[map.fl]} position="fl" label={`T${map.fl}`} />
      </div>
    </div>
  );

  return (
    <div className="card rcs-card">
      <h2>THRUSTERS</h2>
      <div className="manifolds-wrapper-vertical">
        {renderManifold("TOP", TOP_MAP)}
        {renderManifold("BOTTOM", BOTTOM_MAP)}
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
