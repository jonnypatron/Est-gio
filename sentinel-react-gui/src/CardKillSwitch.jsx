import { useState, useEffect, useRef } from 'react';


function CardKillSwitch({ ros }) {
  const topicRef = useRef(null);

  useEffect(() => {
    if (ros) {
      topicRef.current = new window.ROSLIB.Topic({
        ros: ros,
        name: '/kill_switch',
        messageType: 'std_msgs/Int32',
        throttle_rate: 100
      });
      topicRef.current.advertise();
    }

    // Cleanup quando o componente é desmontado
    return () => {
      if (topicRef.current) {
        topicRef.current.unadvertise();
      }
    };
  }, [ros]);

  const handleArm = () => {
    if (topicRef.current) {
      // 2 = Open All (Armar sistema)
      topicRef.current.publish(new window.ROSLIB.Message({ data: 2 }));
      console.log('Sistema Armado -> OPEN ALL (2)');
    }
  };

  const handleKill = () => {
    if (topicRef.current) {
      // 1 = Close All (Cortar alimentação)
      topicRef.current.publish(new window.ROSLIB.Message({ data: 1 }));
      console.log('EMERGÊNCIA -> CLOSE ALL (1)');
    }
  };

  return (
    <div className="card kill-switch-card" style={{ height: '100%', padding: '15px' }}>
      <div className="kill-switch-actions" style={{ display: 'flex', gap: '15px', height: '100%' }}>
        <button 
          className="btn-arm" 
          onClick={handleArm}
          style={{ flex: 1, padding: '25px', fontSize: '1.4rem', fontWeight: '900', borderRadius: '12px' }}
        >
          🔓 OPEN ALL
        </button>
        <button 
          className="btn-kill" 
          onClick={handleKill}
          style={{ flex: 1, padding: '25px', fontSize: '1.4rem', fontWeight: '900', borderRadius: '12px' }}
        >
          🛑 CLOSE ALL
        </button>
      </div>
    </div>
  );
}

export default CardKillSwitch;