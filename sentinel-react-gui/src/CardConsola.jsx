import { useState, useEffect, useRef } from 'react';
import * as ROSLIB from 'roslib';

function CardConsola({ ros }) {
  const [logs, setLogs] = useState([]);
  const consoleRef = useRef(null);

  useEffect(() => {
    if (!ros) return;

    // Subscrever ao tópico de Logs
    const topicoLogs = new ROSLIB.Topic({
      ros: ros,
      name: '/logs',
      messageType: 'std_msgs/msg/String',
      throttle_rate: 500 // 2 vezes por segundo é suficiente para logs
    });

    // Subscrever ao tópico de Tasks (Tarefas)
    const topicoTasks = new ROSLIB.Topic({
      ros: ros,
      name: '/tasks',
      messageType: 'std_msgs/msg/String',
      throttle_rate: 500
    });

    const adicionarLog = (mensagem, tipo) => {
      const hora = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const novoLog = { hora, texto: mensagem, tipo };

      setLogs((prevLogs) => {
        // Limitar a 50 linhas para poupar a memória do browser
        const atualizados = [...prevLogs, novoLog];
        if (atualizados.length > 50) {
          atualizados.shift(); 
        }
        return atualizados;
      });
    };

    topicoLogs.subscribe((msg) => adicionarLog(msg.data, 'LOG'));
    topicoTasks.subscribe((msg) => adicionarLog(msg.data, 'TASK'));

    return () => {
      topicoLogs.unsubscribe();
      topicoTasks.unsubscribe();
    };
  }, [ros]);

  // Auto-scroll para a última mensagem
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
          <div className="log-line">A aguardar dados da Sentinel...</div>
        )}
        
        {logs.map((log, index) => (
          <div key={index} className={`log-line ${log.tipo.toLowerCase()}`}>
            <span className="log-time">[{log.hora}]</span>
            <span className="log-type">[{log.tipo}]</span>
            <span className="log-text">{log.texto}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CardConsola;