import { useState, useEffect } from 'react';
import * as ROSLIB from 'roslib';
import CircularGauge from './CircularGauge';

function CardAmbiente({ ros }) {
    const [temperatura, setTemperatura] = useState(0);
    const [pressao, setPressao] = useState(0);

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
            <h2>AMBIENTE</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
        
                <CircularGauge 
                value={temperatura} 
                min={0} max={100} 
                label="TEMPERATURA" unit="°C" 
                />
        
                <CircularGauge 
                value={pressao} 
                min={0} max={20} 
                label="PRESSÃO" unit="bar" 
                color="#3498db"
                />
        
            </div>
        </div>
    );
}

export default CardAmbiente;
