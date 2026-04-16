import { useState, useEffect } from 'react';


function CardAmbiente({ ros }) {
    const [temperatura, setTemperatura] = useState(0);
    const [pressao, setPressao] = useState(0);

    useEffect(() => {
        if (!ros) return;

        const topicoTemperatura = new window.ROSLIB.Topic({
            ros: ros,
            name: '/Temperature',
            messageType: 'sensor_msgs/msg/Temperature',
            throttle_rate: 50
        });

        const topicoPressao = new window.ROSLIB.Topic({
            ros: ros,
            name: '/adc/pressure',
            messageType: 'std_msgs/msg/Float32',
            throttle_rate: 50
        });

        topicoTemperatura.subscribe((mensagem) => {
            setTemperatura(mensagem.temperature);
        });

        topicoPressao.subscribe((mensagem) => {
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
            <h2 className="ambiente-title">AMBIENTE</h2>
            
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