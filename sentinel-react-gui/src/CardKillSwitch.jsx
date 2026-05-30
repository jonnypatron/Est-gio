import { useState, useEffect, useRef } from 'react';


function CardKillSwitch({ ros }) {
  const topicRef = useRef(null);
  const [armed, setArmed] = useState(null); // estado REAL no bus: 2=OPEN/ARMED, 1=CLOSED/SAFE

  useEffect(() => {
    if (!ros) return;

    topicRef.current = new window.ROSLIB.Topic({
      ros,
      name: '/kill_switch',
      messageType: 'std_msgs/msg/Int32',
      throttle_rate: 100,
    });
    topicRef.current.advertise();

    // ECO: ouvimos o /kill_switch para refletir o estado real (e não só o último clique).
    const stateTopic = new window.ROSLIB.Topic({
      ros,
      name: '/kill_switch',
      messageType: 'std_msgs/msg/Int32',
      throttle_rate: 200,
    });
    stateTopic.subscribe((msg) => {
      if (typeof msg?.data !== 'undefined') setArmed(msg.data);
    });

    return () => {
      stateTopic.unsubscribe();
      if (topicRef.current) topicRef.current.unadvertise();
    };
  }, [ros]);

  const handleArm = () => {
    if (topicRef.current) {
      topicRef.current.publish(new window.ROSLIB.Message({ data: 2 }));
      console.log('Sistema Armado -> OPEN ALL (2)');
    }
  };

  const handleKill = () => {
    if (topicRef.current) {
      topicRef.current.publish(new window.ROSLIB.Message({ data: 1 }));
      console.log('EMERGÊNCIA -> CLOSE ALL (1)');
    }
  };

  const isArmed = armed === 2;
  const isSafe  = armed === 1;
  const statusColor = isArmed ? '#00d66b' : isSafe ? '#ff4d4d' : '#666';
  const statusText  = isArmed ? 'ARMED — OPEN' : isSafe ? 'SAFE — CLOSED' : 'UNKNOWN';

  return (
    <div className="card kill-switch-card">
      {/* ECO: estado real reportado pelo bus */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '8px', marginBottom: '10px', fontSize: '11px', letterSpacing: '1px',
        fontFamily: "'Courier New', monospace", fontWeight: 'bold',
      }}>
        <span style={{
          width: '9px', height: '9px', borderRadius: '50%',
          backgroundColor: statusColor,
          boxShadow: armed !== null ? `0 0 7px ${statusColor}` : 'none',
        }} />
        <span style={{ color: statusColor }}>{statusText}</span>
      </div>

      <div className="kill-switch-actions">
        <button className="btn-arm" onClick={handleArm}>
          🔓 OPEN ALL
        </button>
        <button className="btn-kill" onClick={handleKill}>
          🛑 CLOSE ALL
        </button>
      </div>
    </div>
  );
}

export default CardKillSwitch;