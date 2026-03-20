import { useState, useEffect } from 'react';
import * as ROSLIB from 'roslib';

function CardForcaG({ ros }) {
    const [forcaG, setForcaG] = useState(0.0);

    useEffect(() => {
        const topicoAceleracao = new ROSLIB.Topic({
            ros: ros,
            name: '/aceleracao_linear',
            messageType: 'geometry_msgs/msg/Vector3'
        });

        topicoAceleracao.subscribe((mensagem) => {
            const gAtual = mensagem.z / 9.81;
            setForcaG(gAtual);
        });

        return () => {
            topicoAceleracao.unsubscribe();
        };
    }, [ros]);

    const visualG = Math.max(-3, Math.min(3, forcaG));
    const alturaBalao = 50 + (visualG / 3) * 50; 

    return (
        <div className="card" style={{ width: '250px', height: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2>Força Gz</h2>
            
            <div style={{ position: 'relative', height: '180px', width: '60px', marginTop: '10px' }}>
                
                <div style={{ 
                    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                    height: '100%', width: '2px', borderLeft: '2px dashed #555' 
                }}></div>

                <span style={{ position: 'absolute', top: '-5px', right: '-25px', fontSize: '12px', color: '#aaa' }}>+3G</span>
                <span style={{ position: 'absolute', top: '50%', right: '-25px', transform: 'translateY(-50%)', fontSize: '12px', color: '#aaa' }}>0G</span>
                <span style={{ position: 'absolute', bottom: '-5px', right: '-25px', fontSize: '12px', color: '#aaa' }}>-3G</span>

                <div style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: `${alturaBalao}%`,
                    transform: 'translate(-50%, 50%)',
                    backgroundColor: 'white',
                    color: 'black',
                    padding: '4px 10px',
                    borderRadius: '15px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    boxShadow: '0px 0px 10px rgba(255,255,255,0.5)',
                    transition: 'bottom 0.1s linear'
                }}>
                    {forcaG.toFixed(1)} G
                </div>

            </div>
        </div>
    );
}

export default CardForcaG;