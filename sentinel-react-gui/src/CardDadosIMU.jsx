import { useState, useEffect } from 'react';
import * as ROSLIB from 'roslib';

function CardDadosIMU({ ros }) {
    const [velAngular, setVelAngular] = useState({ x: '--', y: '--', z: '--' });
    const [acelLinear, setAcelLinear] = useState({ x: '--', y: '--', z: '--' });

    useEffect(() => {  
        const topicoVelocidadeAngular = new ROSLIB.Topic({
            ros: ros,
            name: '/velocidade_angular',
            messageType: 'geometry_msgs/msg/Vector3'
        });

        const topicoAceleracaoLinear = new ROSLIB.Topic({
            ros: ros,
            name: '/aceleracao_linear',
            messageType: 'geometry_msgs/msg/Vector3'
        });

        topicoVelocidadeAngular.subscribe((mensagem) => {  
            setVelAngular({
                x: mensagem.x.toFixed(2),
                y: mensagem.y.toFixed(2),
                z: mensagem.z.toFixed(2)
            });
        });

        topicoAceleracaoLinear.subscribe((mensagem) => {
            setAcelLinear({
                x: mensagem.x.toFixed(2),
                y: mensagem.y.toFixed(2),
                z: mensagem.z.toFixed(2)
            });
        });

        return () => {
            topicoVelocidadeAngular.unsubscribe();
            topicoAceleracaoLinear.unsubscribe();
        };
    }, [ros]);

return (
        <div className="card" style={{ width: '500px' }}>
            <h2>Dados Físicos</h2>
            <div style={{ textAlign: 'center', fontSize: '25px', lineHeight: '1.8', marginTop: '15px' }}>
                <p style={{ margin: '0', color: '#aaa' }}><strong>Vel. Angular (rad/s):</strong></p>
                X: <span style={{ color: '#00d66b' }}>{velAngular.x}</span> | 
                Y: <span style={{ color: '#00d66b' }}>{velAngular.y}</span> | 
                Z: <span style={{ color: '#00d66b' }}>{velAngular.z}</span>
                
                <p style={{ margin: '15px 0 0 0', color: '#aaa' }}><strong>Acel. Linear (m/s²):</strong></p>
                X: <span style={{ color: '#8ec7ff' }}>{acelLinear.x}</span> | 
                Y: <span style={{ color: '#8ec7ff' }}>{acelLinear.y}</span> | 
                Z: <span style={{ color: '#8ec7ff' }}>{acelLinear.z}</span>
            </div>
        </div>
    );
}

export default CardDadosIMU;