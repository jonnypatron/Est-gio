import { useState, useEffect, useRef } from 'react';


function CardAmbiente({ ros, isActive }) {
    const [temperatura, setTemperatura] = useState(0);
    const [pressao, setPressao] = useState(0);

    const isActiveRef = useRef(isActive);

    useEffect(() => {
        isActiveRef.current = isActive;
    }, [isActive]);

    useEffect(() => {
        if (!ros) return;

        const topicoTemperatura = new window.ROSLIB.Topic({
            ros: ros,
            name: '/Temperature',
            messageType: 'sensor_msgs/msg/Temperature',
            throttle_rate: 500
        });

        const topicoPressao = new window.ROSLIB.Topic({
            ros: ros,
            name: '/adc/pressure',
            messageType: 'std_msgs/msg/Float32',
            throttle_rate: 500
        });

        topicoTemperatura.subscribe((mensagem) => {
            if (!isActiveRef.current) return;
            setTemperatura(mensagem.temperature);
        });

        topicoPressao.subscribe((mensagem) => {
            if (!isActiveRef.current) return;
            setPressao(mensagem.data); 
        });

        return () => {
            topicoTemperatura.unsubscribe();
            topicoPressao.unsubscribe();
        };
    }, [ros]);

    return (
        <div className="card">
            {/* O h2 fica aqui caso precises dele no PC, mas vamos escondê-lo no telemóvel */}
            <h2 className="ambiente-title">ENVIRONMENT</h2>
            
            <div className="ambiente-container">
                <div className="ambiente-item">
                    <span className="ambiente-value">
                        {typeof temperatura === 'number' ? temperatura.toFixed(1) : '0.0'}
                    </span>
                    <span className="ambiente-unit">°C</span>
                </div>
        
                <div className="ambiente-item">
                    <span className="ambiente-value" style={{ color: '#3498db' }}>
                        {typeof pressao === 'number' ? pressao.toFixed(1) : '0.0'}
                    </span>
                    <span className="ambiente-unit">bar</span>
                </div>
            </div>
        </div>
    );
}

export default CardAmbiente;