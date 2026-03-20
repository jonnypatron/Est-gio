import { useState, useEffect } from 'react';
import * as ROSLIB from 'roslib';

function CardAmbiente({ ros }) {
    const [temperatura, setTemperatura] = useState('--');
    const [pressao, setPressao] = useState('--');

    useEffect(() => {
        const topicoTemperatura = new ROSLIB.Topic({
            ros: ros,
            name: '/Temperature',
            messageType: 'sensor_msgs/msg/Temperature'
        });

        const topicoPressao = new ROSLIB.Topic({
            ros: ros,
            name: '/adc/pressure',
            messageType: 'std_msgs/msg/Float32'
        });

        topicoTemperatura.subscribe((mensagem) => {
            setTemperatura(mensagem.temperature.toFixed(2));
        });

        topicoPressao.subscribe((mensagem) => {
            setPressao(mensagem.data.toFixed(2)); 
        });

        return () => {
            topicoTemperatura.unsubscribe();
            topicoPressao.unsubscribe();
        };
    }, [ros]);

    return (
        <div className="card">
            <h2>Ambiente</h2>
            <div className="data-value" style={{ color: '#00d66b' }}>
                {temperatura} °C
            </div>
            <div className="data-value" style={{ color: '#00d66b' }}>
                {pressao} bar
            </div>
        </div>
    );
}

export default CardAmbiente;
