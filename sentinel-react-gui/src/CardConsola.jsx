import { useState, useEffect, useRef } from 'react';


function CardConsola({ ros }) {
  const [logs, setLogs] = useState([]);
  const consoleRef = useRef(null);

  // NOTA: deixámos de filtrar por isActive.
  // O terminal é um BUFFER de missão: tem de capturar /logs e /tasks SEMPRE,
  // mesmo quando o operador está na página de Controlo a enviar tarefas.
  // (Antes, os subscribers só guardavam quando a página Telemetria estava ativa,
  //  por isso as tasks enviadas no Controlo nunca chegavam a aparecer.)
  useEffect(() => {
    if (!ros) return;

    const topicoLogs = new window.ROSLIB.Topic({
      ros: ros,
      name: '/logs',
      messageType: 'std_msgs/msg/String',
      throttle_rate: 500
    });

    const topicoTasks = new window.ROSLIB.Topic({
      ros: ros,
      name: '/tasks',
      messageType: 'std_msgs/msg/String',
      throttle_rate: 500
    });

    const adicionarLog = (mensagem, tipo) => {
      const hora = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
      const novoLog = { hora, texto: mensagem, tipo };

      setLogs((prevLogs) => {
        const atualizados = [...prevLogs, novoLog];
        if (atualizados.length > 50) {
          atualizados.shift();
        }
        return atualizados;
      });
    };

    topicoLogs.subscribe((msg) => {
      adicionarLog(msg.data, 'LOG');
    });
    topicoTasks.subscribe((msg) => {
      adicionarLog(msg.data, 'TASK');
    });

    return () => {
      topicoLogs.unsubscribe();
      topicoTasks.unsubscribe();
    };
  }, [ros]);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="card console-card">
      <div className="console-header">
        <span className="console-title">TERMINAL</span>
        <span className="console-status blink">LOGS/TASKS</span>
      </div>

      <div className="console-window" ref={consoleRef}>
        {logs.length === 0 && (
          <div className="log-line">Waiting data from Sentinel...</div>
        )}

        {logs.map((log, index) => (
          <div key={index} className={`log-line ${log.tipo.toLowerCase()}`}>
            <span className="log-time">[{log.hora}]</span>
            <span className="log-type">[{log.tipo === 'LOG' ? 'L' : 'T'}]</span>
            <span className="log-text">{log.texto}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CardConsola;