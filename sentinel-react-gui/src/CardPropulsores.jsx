import { useState, useEffect } from 'react';
import * as ROSLIB from 'roslib';

function CardPropulsores({ ros }) {
    const [leds, setLeds] = useState([0, 0, 0, 0, 0, 0, 0, 0]);

    useEffect(() => {
        const topicoPropulsores = new ROSLIB.Topic({
            ros: ros,
            name: '/propulsores_array',
            messageType: 'std_msgs/msg/Int32MultiArray'
        });

        topicoPropulsores.subscribe((mensagem) => {
            setLeds(mensagem.data);
        });
    }, [ros]);

    const renderLed = (index, label) => {
        return (
            <div className="thrusters">
                {label}
                <div 
                    className="led"
                    style={{ backgroundColor: leds[index] === 1 ? '#00d66b' : 'gray' }}
                    ></div>
            </div>
        );
    };

    return (
        <>
            <div className="card">
                <h2>Propulsores de Cima</h2>
                <div className="ring-grid">
                    {renderLed(7, "Frente Esq.")}
                    {renderLed(4, "Frente Dir.")}
                    {renderLed(6, "Trás Esq.")}
                    {renderLed(5, "Trás Dir.")}
                </div>
            </div>

            <div className="card">
                <h2>Propulsores de Baixo</h2>
                <div className="ring-grid">
                    {renderLed(3, "Frente Esq.")}
                    {renderLed(0, "Frente Dir.")}
                    {renderLed(2, "Trás Esq.")}
                    {renderLed(1, "Trás Dir.")}
                </div>
            </div>
        </>
    );
}

export default CardPropulsores;